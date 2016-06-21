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

app.run(function($rootScope, config, constants, userService, transcodeService, uploadService){
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
      case "uploading-success":
        uploadService.receiveUploadSuccess(msg.msg);
        break;
      case "uploading-error":
        uploadService.receiveUploadError(msg.msg);
        break;
      case "logout":
        userService.logout();
        break;
    }
  });
});
