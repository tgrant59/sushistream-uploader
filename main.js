const electron = require("electron")
const {app, BrowserWindow, Menu, shell, dialog} = electron;
const util = require("util");
const child_process = require("child_process");
const fs = require("fs-extra");
const fileTail = require("file-tail");
const request = require("superagent");
const config = require("./config");

// Transcoding variables
const ffprobe = __dirname + "/bin/ffprobe";
const ffprobeParamsPre = ["-i"];
const ffprobeParamsPost = ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames", "-of",
  "default=nokey=1:noprint_wrappers=1"];
const ffmpeg = __dirname + "/bin/ffmpeg";
const ffmpegParamsPre = ["-i"];
const ffmpegParamsPost =  ["-acodec", "aac", "-hls_list_size", "0", "-hls_time",
  "5", "-hls_segment_filename", `${config.tmpDir}/transcoding/%05d.ts`, `${config.tmpDir}/transcoding/index.m3u8`,
  "-progress", `${config.tmpDir}/transcoding/progress.log`];
var transcodingDir = config.tmpDir + "/transcoding/";
var uploadDir = config.tmpDir + "/upload/";
var logfile = transcodingDir + "progress.log";
var transcoder;
var transcoderVideoId;
var tail;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function appInit() {
  createWindow();
  // Browser object communication controller
  electron.ipcMain.on("electron-msg", (event, msg) => {
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
    }
  });
}

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
    var choice = dialog.showMessageBox(win, {
        type: "question",
        buttons: ["Yes", "No"],
        title: "Confirm",
        message: "Are you sure you want to quit? Any transcoding or uploading jobs will be cancelled."
      });
    if (choice === 0) {
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
      }, 500);
    }
  });

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", appInit);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it is common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

////////// Menu creation //////////

let menuTemplate = [{
  label: "Account",
  submenu: [{
    label: "Modify Account Settings",
    click() { shell.openExternal(config.externalAppUrl + "/account/profile"); }
  }, {
    label: "Logout",
    click() {
      win.webContents.send("electron-msg", {
        event: "logout"
      });
    }
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
  }]
}];

if (process.platform === "darwin") {
  menuTemplate.unshift({
    label: "SushiStream Uploader",
    submenu: [{
      label: "About SushiStream Uploader",
      role: "about"
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

////////// Event Handlers //////////

// ------ Transcoding Functions ------
fs.removeSync(config.tmpDir);
fs.mkdirSync(config.tmpDir);
fs.mkdirSync(uploadDir);


function getVideoFrames(video) {
  var ffprobeParams = ffprobeParamsPre.concat([video.path]).concat(ffprobeParamsPost);
  child_process.execFile(ffprobe, ffprobeParams, function(err, stdout, stderr){
    var msg = {
      id: video.id
    }
    if (err) {
      console.log(err);
      msg.error = true;
    } else {
      msg.frames = parseInt(stdout);
    }
    if (win) {
      win.webContents.send("electron-msg", {
        event: "transcoding-frames",
        msg: msg
      });
    }
  });
}

function startTranscoding(video) {
  console.log(video);
  if (transcoder) {
    tail.stop();
    transcoder.kill();
  }
  transcoderVideoId = video.id;
  fs.removeSync(transcodingDir);
  fs.mkdirSync(transcodingDir);
  var fd = fs.openSync(logfile, "w");
  fs.close(fd);
  var ffmpegParams = ffmpegParamsPre.concat([video.path]).concat(ffmpegParamsPost);

  tail = fileTail.startTailing(logfile);
  tail.on("line", function (line) {
    lineList = line.split("=");
    if (lineList[0] === "frame") {
      if (win) {
        win.webContents.send("electron-msg", {
          event: "transcoding-progress-frames",
          msg: {
            id: video.id,
            frames: parseInt(lineList[1])
          }
        });
      }
    } else if (lineList[0] === "fps") {
      if (win) {
        win.webContents.send("electron-msg", {
          event: "transcoding-progress-fps",
          msg: {
            id: video.id,
            fps: parseFloat(lineList[1])
          }
        });
      }
    }
  });
  tail.on("tailError", function(err) {
    console.log("tail", err);
    tail.stop();
  });
  
  transcoder = child_process.execFile(ffmpeg, ffmpegParams, {maxBuffer: 10000 * 1024}, function(err) {
    tail.stop();
    transcoder = null;
    transcoderVideoId = null;
    if (err) {
      console.log(err);
      fs.removeSync(transcodingDir);
      if (win) {
        win.webContents.send("electron-msg", {
          event: "transcoding-error",
          msg: {id: video.id, err: err}
        });
      }
    } else {
      fs.removeSync(logfile);
      var newUploadDir = uploadDir + video.id + "/"
      fs.move(transcodingDir, newUploadDir.slice(0, -1), function(err){
        if (!err) {
          fs.removeSync(transcodingDir);
          var files = fs.readdirSync(newUploadDir);
          var folderSize = 0;
          for (var i = 0; i < files.length; i++) {
            folderSize = folderSize + fs.statSync(newUploadDir + files[i]).size;
          }
          if (win) {
            win.webContents.send("electron-msg", {
              event: "transcoding-finished",
              msg: {
                id: video.id,
                shardsToUpload: files,
                size: folderSize
              }
            });
          }
        } else {
          console.log(err);
          if (win) {
            win.webContents.send("electron-msg", {
              event: "transcoding-error",
              msg: {id: video.id}
            });
          }
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
    fs.removeSync(transcodingDir);
    if (win) {
      win.webContents.send("electron-msg", {
        event: "transcoding-abort",
        msg: {id: video.id}
      });
    }
  }
}

// ------ Upload functions ------

function uploadShard(msg) {
  try {
    request
      .post(msg.signedUrl.url)
      .field("key", msg.signedUrl.fields.key)
      .field("AWSAccessKeyId", msg.signedUrl.fields.AWSAccessKeyId)
      .field("Policy", msg.signedUrl.fields.policy)
      .field("Signature", msg.signedUrl.fields.signature)
      .attach("file", uploadDir + msg.id + "/" + msg.file)
      .end(function (err, res) {
        if (err) {
          console.log("uploading err: ", err);
          fs.removeSync(uploadDir + msg.id);
          if (win) {
            win.webContents.send("electron-msg", {
              event: "uploading-error",
              msg: {
                id: msg.id
              }
            });
          }
        } else {
          if (win) {
            win.webContents.send("electron-msg", {
              event: "uploading-success",
              msg: {
                id: msg.id,
                filename: msg.file
              }
            });
          }
        }
      });
  } catch (err) {
    console.log("uploading err: ", err);
    fs.removeSync(uploadDir + msg.id);
    if (win) {
      win.webContents.send("electron-msg", {
        event: "uploading-error",
        msg: {
          id: msg.id
        }
      });
    }
  }
}
