var app = angular.module("backgroundProcessServiceModule", []);

app.factory("backgroundProcessService", function(config) {
  return require("electron-process").foreground.getModule(require(config.backgroundProcessModulePath));
});
