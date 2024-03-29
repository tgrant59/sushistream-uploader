var app = angular.module("subscribeModule", []);

app.controller("subscribeCtrl", function($scope, electron, config, userService){
  $scope.logout = userService.logout;
  $scope.openExternalSubscribe = openExternalSubscribe;
  $scope.refreshUser = refreshUser;

  //////////

  function openExternalSubscribe() {
    electron.shell.openExternal(config.externalUrl + "/account/subscription");
  }

  function refreshUser() {
    $scope.refreshingUserLoading = true;
    $scope.refreshingUserError = false;
    userService.initUser()
      .then(function(){
        userService.sendToRightPage();
      }, function(){
        $scope.refreshingUserError = true;
      }).finally(function(){
        $scope.refreshingUserLoading = false;
      });
  }
  
});
