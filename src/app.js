var app = angular.module("sushistream-uploader", [
  "ngCookies",
  "ui.router",
  "electangular",
  // Config
  "configModule",
  "constantsModule",
  "routesModule",
  "globalsModule",
  // Pages
  "dashboardModule",
  "loginModule",
  "subscribeModule",
  "unverifiedModule"
]);

app.run(function($rootScope, ipc, config, constants, userService, transcodeService, uploadService){
  $rootScope.config = config;
  $rootScope.constants = constants;
  userService.initUser();
  
  // Initialize Electron communication controller
  $rootScope.$on("electron-msg", function(event, msg) {
    switch (msg.event) {
      case "transcoding-frames":
        transcodeService.updateTranscodingFrames(msg.msg);
        break;
      case "transcoding-progress-frames":
        transcodeService.updateTranscodingProgressFrames(msg.msg);
        break;
      case "transcoding-progress-fps":
        transcodeService.updateTranscodingProgressFps(msg.msg);
        break;
      case "transcoding-finished":
        uploadService.loadShards(msg.msg);
        break;
      case "transcoding-error":
        transcodeService.receiveTranscodingError(msg.msg);
        break;
      case "transcoding-abort":
        transcodeService.receiveTranscodingAbort(msg.msg);
        break;
      case "uploading-success":
        uploadService.receiveUploadSuccess(msg.msg);
        break;
      case "uploading-error":
        uploadService.receiveUploadError(msg.msg);
        break;
      case "uploading-abort":
        uploadService.receiveUploadAbortAll();
        break;
      case "confirm-close":
        confirmOnClose();
        break;
      case "logout":
        userService.logout();
        break;
    }
  });
  
  ///////////
  
  function confirmOnClose() {
    var confirm = false;
    if ($rootScope.queuedUploads) {
      for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
        var upload = $rootScope.queuedUploads[i];
        if (upload.status === constants.statuses.transcoding || 
            upload.status === constants.statuses.uploading ||
            upload.status === constants.statuses.queued ||
            upload.status === constants.statuses.queuedUpload) {
          confirm = true;
          break;
        }
      }
    }
    ipc.send({
      event: "confirm-close",
      msg: {
        confirmOnClose: confirm
      }
    });
  }
  
});
