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

app.controller("bodyCtrl", function($rootScope, userService, config, constants){
  $rootScope.config = config;
  $rootScope.constants = constants;
  userService.initUser();
});
