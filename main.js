const electron = require('electron')
const {app, BrowserWindow, Menu, shell} = electron;
const util = require("util");
const child_process = require('child_process');
const fs = require("fs-extra");
const fileTail = require("file-tail");
const request = require("superagent");

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
  win.loadURL(encodeURIComponent(`file://${__dirname}/dist/index.html`));

  // Open the DevTools.
  win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  // Browser object communication controller
  electron.ipcMain.on('electron-msg', (event, msg) => {
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
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
    click() { shell.openExternal("https://app.sushistream.co/account/profile"); }
  }, {
    label: "Logout",
    click() {
      win.webContents.send('electron-msg', {
        event: "logout"
      });
    }
  }]
}, {
  label: "Window",
  role: "window",
  submenu: [{
    label: 'Minimize',
    accelerator: 'CmdOrCtrl+M',
    role: 'minimize'
  }, {
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  }, {
    label: 'Toggle Full Screen',
    accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
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
    click() { shell.openExternal("https://app.sushistream.co/feedback"); }
  }, {
    label: 'Learn More',
    click() { shell.openExternal("https://sushistream.co"); }
  }]
}];

if (process.platform === "darwin") {
  let name = app.getName();
  menuTemplate.unshift({
    label: name,
    submenu: [{
      label: 'About ' + name,
      role: 'about'
    }, {
      type: 'separator'
    }, {
      label: 'Services',
      role: 'services',
      submenu: []
    }, {
      type: 'separator'
    }, {
      label: 'Hide ' + name,
      accelerator: 'Command+H',
      role: 'hide'
    }, {
      label: 'Hide Others',
      accelerator: 'Command+Alt+H',
      role: 'hideothers'
    }, {
      label: 'Show All',
      role: 'unhide'
    }, {
      type: 'separator'
    }, {
      label: 'Quit',
      accelerator: 'Command+Q',
      click() { app.quit(); }
    },
    ]
  });
  // Window menu
  menuTemplate[2].submenu = [{
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  },{
    label: 'Minimize',
    accelerator: 'CmdOrCtrl+M',
    role: 'minimize'
  }, {
    label: 'Toggle Full Screen',
    accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
    click(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }
  }, {
    label: 'Zoom',
    role: 'zoom'
  }, {
    type: 'separator'
  }, {
    label: 'Bring All to Front',
    role: 'front'
  }];
}

const menu = Menu.buildFromTemplate(menuTemplate);

////////// Event Handlers //////////

// Transcoding Functions
const ffprobe = `"${__dirname}/bin/ffprobe" -i "%s" -v error -select_streams v:0 -show_entries stream=nb_frames -of default=nokey=1:noprint_wrappers=1`
const ffmpeg = `${__dirname}/bin/ffmpeg`;
const ffmpegParamsPre = ['-i'];
const ffmpegParamsPost =  ['-acodec', 'aac', '-hls_list_size', '0', '-hls_time',
  '5', '-hls_segment_filename', `${__dirname}/tmp/transcoding/%05d.ts`, `${__dirname}/tmp/transcoding/index.m3u8`,
  '-progress', `${__dirname}/tmp/transcoding/progress.log`];
var transcodingDir = __dirname + "/tmp/transcoding/";
var uploadDir = __dirname + "/tmp/upload/";
var logfile = transcodingDir + "progress.log";
var transcoder;
var transcoderVideoId;
var tail;

fs.removeSync(__dirname + "/tmp");
fs.mkdirSync(__dirname + "/tmp");
fs.mkdirSync(uploadDir);


function getVideoFrames(video) {
  var ffprobe_cmd = util.format(ffprobe, video.path)
  child_process.exec(ffprobe_cmd, function(err, stdout, stderr){
    var msg = {
      id: video.id
    }
    if (err) {
      console.log(err);
      msg.error = true;
    } else {
      msg.frames = parseInt(stdout);
    }
    win.webContents.send('electron-msg', {
      event: "transcoding-frames",
      msg: msg
    });
  });
}

function startTranscoding(video) {
  fs.removeSync(transcodingDir);
  fs.mkdirSync(transcodingDir);
  var fd = fs.openSync(logfile, 'w');
  fs.close(fd);
  var ffmpegParams = ffmpegParamsPre.concat([video.path]).concat(ffmpegParamsPost);
  transcoder = child_process.spawn(ffmpeg, ffmpegParams);
  transcoderVideoId = video.id;

  tail = fileTail.startTailing(logfile);
  tail.on('line', function (line) {
    lineList = line.split("=");
    if (lineList[0] === "frame") {
      win.webContents.send('electron-msg', {
        event: "transcoding-progress-frames",
        msg: {
          id: video.id,
          frames: parseInt(lineList[1])
        }
      });
    } else if (lineList[0] === "fps") {
      win.webContents.send('electron-msg', {
        event: "transcoding-progress-fps",
        msg: {
          id: video.id,
          fps: parseFloat(lineList[1])
        }
      });
    }
  });
  tail.on("tailError", function(err) {
    console.log("tail", err);
    tail.stop();
  });

  transcoder.on('close', function(code){
    if (code === 255) {
      return;
    }
    var msg = {
      id: video.id
    }
    if (code !== 0) {
      console.log(`ffmpeg process exited with code ${code}`);
      msg.error = true;
    }
    tail.stop();
    transcoderVideoId = null;
    fs.removeSync(logfile);
    var newUploadDir = uploadDir + video.id + "/"
    fs.move(transcodingDir, newUploadDir.slice(0, -1), function(err){
      if (!err) {
        fs.removeSync(transcodingDir);
        var files = fs.readdirSync(newUploadDir);
        msg.shardsToUpload = files;
        var folderSize = 0;
        for (var i = 0; i < files.length; i++) {
          folderSize = folderSize + fs.statSync(newUploadDir + files[i]).size;
        }
        msg.size = folderSize;
        win.webContents.send('electron-msg', {
          event: "transcoding-finished",
          msg: msg
        });
      } else {
        console.log(err);
      }
    });
  });

  transcoder.on('error', function(err){
    console.log("transcode err", err);
    tail.stop();
    transcoderVideoId = null;
    fs.removeSync(transcodingDir);
    win.webContents.send('electron-msg', {
      event: "transcoding-error",
      msg: {
        id: video.id
      }
    });
  });
}

function abortTranscoding(video) {
  if (transcoder && transcoderVideoId === video.id) {
    transcoder.kill();
    tail.stop();
    transcoderVideoId = null;
    fs.removeSync(transcodingDir);
  }
}

// Upload functions

function uploadShard(msg) {
  try {
    request
      .post(msg.signedUrl.url)
      .field('key', msg.signedUrl.fields.key)
      .field('AWSAccessKeyId', msg.signedUrl.fields.AWSAccessKeyId)
      .field('Policy', msg.signedUrl.fields.policy)
      .field('Signature', msg.signedUrl.fields.signature)
      .attach('file', uploadDir + msg.id + "/" + msg.file)
      .end(function (err, res) {
        if (err) {
          console.log("uploading err: ", err);
          fs.removeSync(uploadDir + msg.id);
          win.webContents.send('electron-msg', {
            event: "uploading-error",
            msg: {
              id: msg.id
            }
          });
        } else {
          win.webContents.send('electron-msg', {
            event: "uploading-success",
            msg: {
              id: msg.id,
              filename: msg.file
            }
          })
        }
      });
  } catch (err) {
    console.log("uploading err: ", err);
    fs.removeSync(uploadDir + msg.id);
    win.webContents.send('electron-msg', {
      event: "uploading-error",
      msg: {
        id: msg.id
      }
    });
  }
}
