if(require('electron-squirrel-startup')) return;  // To make Squirrel.Windows work
const electron = require("electron")
const {app, BrowserWindow, Menu, shell, dialog, autoUpdater, crashReporter} = electron;
const util = require("util");
const child_process = require("child_process");
const fs = require("fs-extra");
const fileTail = require("file-tail");
const request = require("superagent");
const config = require("./config");

// Transcoding variables
const ffprobe = __dirname + "/bin/" + config.binFilenames.ffprobe;
const ffprobeParamsPre = ["-i"];
const ffprobeParamsPost = ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames", "-of",
  "default=nokey=1:noprint_wrappers=1"];
const ffmpeg = __dirname + "/bin/" + config.binFilenames.ffmpeg;
const ffmpegParamsPre = ["-i"];
const ffmpegParamsPost =  ["-acodec", "aac", "-hls_list_size", "0", "-hls_time",
  "5", "-hls_segment_filename", `${config.tmpDir}/transcoding/%05d.ts`, `${config.tmpDir}/transcoding/index.m3u8`,
  "-progress", `${config.tmpDir}/transcoding/progress.log`, "-loglevel", "quiet"];
var transcodingDir = config.tmpDir + "/transcoding/";
var uploadDir = config.tmpDir + "/upload/";
var logfile = transcodingDir + "progress.log";
var transcoder;
var transcoderVideoId;
var tail;
var quit;

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Window Setup
// ---------------------------------------------------------------------------------------------------------------------
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Set the Menu
  Menu.setApplicationMenu(menu);
  // Create the browser window.
  win = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600
  });

  // and load the index.html of the app.
  win.loadURL(config.indexPath);

  // Open the DevTools.
  if (config.openDevTools) {
    win.webContents.openDevTools();
  }

  // Confirm on closing
  win.on("close", function(e) {
    e.preventDefault();
    sendMessage("confirm-close");
  });

  // Emitted when the window is closed.
  win.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

function confirmClose(msg) {
  if (msg.confirmOnClose) {
    var choice = dialog.showMessageBox(win, {
      type: "question",
      buttons: ["Yes", "No"],
      title: "Confirm",
      message: "Are you sure you want to quit? Any transcoding or uploading jobs will be cancelled."
    });
    if (choice === 0) {
      destroyWindow();
    } else {
      quit = false;
    }
  } else {
    destroyWindow();
  }
}

function destroyWindow() {
  win.webContents.send("electron-msg", {
    event: "uploading-abort",
    msg: {}
  });
  if (transcoder) {
    tail.stop();
    transcoder.kill();
  }
  transcoder = null;
  transcoderVideoId = null;
  setTimeout(function(){
    win.destroy();
    if (quit) {
      app.quit();
    }
  }, 500);
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  App Setup
// ---------------------------------------------------------------------------------------------------------------------
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", appInit);

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  // On OS X it is common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

app.on("before-quit", function() {
  quit = true;
});

function appInit() {
  createWindow();
  // Browser object communication controller
  electron.ipcMain.on("electron-msg", function(event, msg) {
    switch (msg.event) {
      case "transcoding-frames":
        getVideoFrames(msg.msg);
        break;
      case "transcoding-start":
        startTranscoding(msg.msg);
        break;
      case "transcoding-abort":
        abortTranscoding(msg.msg);
        break;
      case "upload-shard":
        uploadShard(msg.msg);
        break;
      case "confirm-close":
        confirmClose(msg.msg);
        break;
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Crash Reporter Setup
// ---------------------------------------------------------------------------------------------------------------------
if (config.crashReporter.start) {
  crashReporter.start({
    productName: config.crashReporter.productName,
    companyName: config.crashReporter.companyName,
    submitURL: config.crashReporter.submitURL,
    autoSubmit: config.crashReporter.autoSubmit
  });
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Auto Updater Setup
// ---------------------------------------------------------------------------------------------------------------------
var manualUpdate;
var checkingUpdate;
var foundUpdate;
if (config.autoUpdater.start) {
  var feedUrl = config.autoUpdater.url + app.getVersion();
  autoUpdater.setFeedURL(feedUrl);
  autoUpdater.checkForUpdates();

  autoUpdater.on("checking-for-update", function(){
    checkingUpdate = true;
    if (manualUpdate) {
      sendMessage("update-checking");
    }
  });

  autoUpdater.on("update-available", function(){
    checkingUpdate = false
    foundUpdate = true;
    if (manualUpdate) {
      sendMessage("update-found");
    }
  });

  autoUpdater.on("update-not-available", function(){
    checkingUpdate = false;
    if (manualUpdate) {
      sendMessage("update-not-found");
    }
    manualUpdate = false;
  });

  autoUpdater.on("update-downloaded", function(){
    dialog.showMessageBox(win, {
      type: "warning",
      buttons: ["Update"],
      title: "New Version Found",
      message: "New version found. Quit now and and install the update"
    });
    manualUpdate = false;
    checkingUpdate = false;
    foundUpdate = false;
    autoUpdater.quitAndInstall();
  });
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Menu Setup
// ---------------------------------------------------------------------------------------------------------------------

let menuTemplate = [{
  label: "Account",
  submenu: [{
    label: "Modify Account Settings",
    click() { shell.openExternal(config.externalAppUrl + "/account/profile"); }
  }, {
    label: "Logout",
    click() { sendMessage("logout"); }
  }]
}, {
  label: "Get More Space",
  submenu: [{
    label: "Modify Subscription",
    click() { shell.openExternal(config.externalAppUrl + "/account/subscription"); }
  }]
}, {
  label: "Window",
  role: "window",
  submenu: [{
    label: "Minimize",
    accelerator: "CmdOrCtrl+M",
    role: "minimize"
  }, {
    label: "Close",
    accelerator: "CmdOrCtrl+W",
    role: "close"
  }, {
    label: "Toggle Full Screen",
    accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
    click(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }
  }]
}, {
  label: "Help",
  role: "help",
  submenu: [{
    label: "Give us Feedback",
    click() { shell.openExternal(config.externalAppUrl + "/feedback"); }
  }, {
    label: "Learn More",
    click() { shell.openExternal(config.externalSiteUrl); }
  }, {
    label: "Check for Updates",
    click () {
      if (config.autoUpdater.start) {
        manualUpdate = true;
        if (checkingUpdate) {
          sendMessage("update-checking");
        } else if (foundUpdate) {
          sendMessage("update-found");
        } else {
          autoUpdater.checkForUpdates();
        }
      }
    }
  }]
}];

if (process.platform === "darwin") {
  menuTemplate.unshift({
    label: "SushiStream Uploader",
    submenu: [{
      label: "About SushiStream Uploader",
      role: "about"
    }, {
      label: "Check for Updates",
      click () {
        if (config.autoUpdater.start) {
          manualUpdate = true;
          if (checkingUpdate) {
            sendMessage("update-checking");
          } else if (foundUpdate) {
            sendMessage("update-found");
          } else {
            autoUpdater.checkForUpdates();
          }
        }
      }
    }, {
      type: "separator"
    }, {
      label: "Services",
      role: "services",
      submenu: []
    }, {
      type: "separator"
    }, {
      label: "Hide SushiStream Uploader",
      accelerator: "Command+H",
      role: "hide"
    }, {
      label: "Hide Others",
      accelerator: "Command+Alt+H",
      role: "hideothers"
    }, {
      label: "Show All",
      role: "unhide"
    }, {
      type: "separator"
    }, {
      label: "Quit",
      accelerator: "Command+Q",
      click() { app.quit(); }
    },
    ]
  });
  // Window menu
  menuTemplate[3].submenu = [{
    label: "Close",
    accelerator: "CmdOrCtrl+W",
    role: "close"
  },{
    label: "Minimize",
    accelerator: "CmdOrCtrl+M",
    role: "minimize"
  }, {
    label: "Toggle Full Screen",
    accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
    click(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }
  }, {
    label: "Zoom",
    role: "zoom"
  }, {
    type: "separator"
  }, {
    label: "Bring All to Front",
    role: "front"
  }];
}

const menu = Menu.buildFromTemplate(menuTemplate);

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Transcoding Setup
// ---------------------------------------------------------------------------------------------------------------------
removeSync(config.tmpDir);
fs.mkdirSync(config.tmpDir);
fs.mkdirSync(uploadDir);


function getVideoFrames(video) {
  var ffprobeParams = ffprobeParamsPre.concat([video.path]).concat(ffprobeParamsPost);
  child_process.execFile(ffprobe, ffprobeParams, function(err, stdout, stderr){
    var msg = {
      id: video.id
    }
    if (err) {
      msg.error = true;
    } else {
      try {
        msg.frames = parseInt(stdout);
      } catch (err) {
        video.noFrames = true;
        msg.noFrames = true;
      }
    }
    sendMessage("transcoding-frames", msg);
  });
}

function startTranscoding(video) {
  if (transcoder) {
    tail.stop();
    transcoder.kill();
  }
  transcoderVideoId = video.id;
  removeSync(transcodingDir);
  fs.mkdirSync(transcodingDir);
  var ffmpegParams = ffmpegParamsPre.concat([video.path]).concat(ffmpegParamsPost);
  try {
    fs.ensureFileSync(logfile);
    tail = fileTail.startTailing(logfile);
  } catch (err) {
    fs.ensureFileSync(logfile);
    try {
      tail = fileTail.startTailing(logfile);
    } catch (err) {}
  }
  tail.on("line", function (line) {
    lineList = line.split("=");
    if (lineList[0] === "frame" && !video.noFrames) {
      sendMessage("transcoding-progress-frames", {
        id: video.id,
        frames: parseInt(lineList[1])
      });
    } else if (lineList[0] === "fps" && !video.noFrames) {
      sendMessage("transcoding-progress-fps", {
        id: video.id,
        fps: parseFloat(lineList[1])
      });
    }
  });
  tail.on("tailError", function(err) {
    tail.stop();
  });
  
  transcoder = child_process.execFile(ffmpeg, ffmpegParams, {maxBuffer: 10000 * 1024}, function(err) {
    tail.stop();
    transcoder = null;
    transcoderVideoId = null;
    if (err) {
      removeSync(transcodingDir);
      sendMessage("transcoding-error", {
        id: video.id, 
        err: err
      });
    } else {
      removeSync(logfile);
      var newUploadDir = uploadDir + video.id + "/"
      fs.move(transcodingDir, newUploadDir.slice(0, -1), function(err){
        if (!err) {
          removeSync(transcodingDir);
          var files = fs.readdirSync(newUploadDir);
          var folderSize = 0;
          for (var i = 0; i < files.length; i++) {
            folderSize = folderSize + fs.statSync(newUploadDir + files[i]).size;
          }
          sendMessage("transcoding-finished", {
            id: video.id,
            shardsToUpload: files,
            size: folderSize
          });
        } else {
          sendMessage("transcoding-error", {
            id: video.id
          });
        }
      });
    }
  });
}

function abortTranscoding(video) {
  if (transcoder && transcoderVideoId === video.id) {
    transcoder.kill();
    transcoder = null;
    tail.stop();
    transcoderVideoId = null;
    removeSync(transcodingDir);
    sendMessage("transcoding-abort", {
      id: video.id
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Upload Setup
// ---------------------------------------------------------------------------------------------------------------------

function uploadShard(msg, retry) {
  try {
    if ("x-amz-security-token" in msg.signedUrl.fields) {  // Production
      request
        .post(msg.signedUrl.url)
        .field("key", msg.signedUrl.fields.key)
        .field("AWSAccessKeyId", msg.signedUrl.fields.AWSAccessKeyId)
        .field("Policy", msg.signedUrl.fields.policy)
        .field("Signature", msg.signedUrl.fields.signature)
        .field("x-amz-security-token", msg.signedUrl.fields["x-amz-security-token"])
        .attach("file", uploadDir + msg.id + "/" + msg.file)
        .end(function (err, res) {
          if (err) {
            removeSync(uploadDir + msg.id);
            sendMessage("uploading-error", {
              id: msg.id
            });
          } else {
            sendMessage("uploading-success", {
              id: msg.id,
              filename: msg.file
            });
          }
        });
    } else {  // Development
      request
        .post(msg.signedUrl.url)
        .field("key", msg.signedUrl.fields.key)
        .field("AWSAccessKeyId", msg.signedUrl.fields.AWSAccessKeyId)
        .field("Policy", msg.signedUrl.fields.policy)
        .field("Signature", msg.signedUrl.fields.signature)
        .attach("file", uploadDir + msg.id + "/" + msg.file)
        .end(function (err, res) {
          if (err) {
            removeSync(uploadDir + msg.id);
            sendMessage("uploading-error", {
              id: msg.id
            });
          } else {
            sendMessage("uploading-success", {
              id: msg.id,
              filename: msg.file
            });
          }
        });
    }
  } catch (err) {
    if (retry) {
      removeSync(uploadDir + msg.id);
      removeSync("uploading-error", {
        id: msg.id
      });
    } else {
      uploadShard(msg, true);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Helper Functions
// ---------------------------------------------------------------------------------------------------------------------

function sendMessage(event, msg) {
  if (win) {
    win.webContents.send("electron-msg", {
      event: event,
      msg: msg
    });
  }
}

function removeSync(file) {
  var i = 0;
  var error;
  while (i < 10) {
    try {
      fs.removeSync(file);
      break;
    } catch (err) {
      error = err;
    }
  }
  if (i === 10) {
    console.log(error);
    throw error;
  }
}
