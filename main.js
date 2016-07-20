if(require('electron-squirrel-startup')) return;  // To make Squirrel.Windows work
const electron = require("electron")
const {app, BrowserWindow, Menu, shell, dialog, autoUpdater, crashReporter} = electron;
const processManager = require('electron-process');
const config = require("./config");

// global scope variables
let backgroundProcessHandler;
let win;
let quit;

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
      case "confirm-close":
        confirmClose(msg.msg);
        break;
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Window Setup
// ---------------------------------------------------------------------------------------------------------------------
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

function createWindow() {
  backgroundProcessHandler = processManager.main.createBackgroundProcess(config.backgroundPath, config.logging);
  // Set the Menu
  Menu.setApplicationMenu(menu);
  // Create the browser window.
  win = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600
  });

  // Background Process
  backgroundProcessHandler.addWindow(win);

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
  sendMessage("uploading-abort");
  processManager.foreground.getModule(require("./background")).abortTranscoding();
  // Give time for the uploading-abort message to reach the renderer
  setTimeout(function(){
    win.destroy();
    if (quit) {
      app.quit();
    }
  }, 500);
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

// -------- Helpers --------

function sendMessage(event, msg) {
  if (win) {
    win.webContents.send("electron-msg", {
      event: event,
      msg: msg
    });
  }
}

function log(msg, origin) {
  if (config.logging) {
    if (origin) {
      console.log("Error Origin: " + origin);
    }
    console.log(msg);
    sendMessage("log", msg);
  }
}
