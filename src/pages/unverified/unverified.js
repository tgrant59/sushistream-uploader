var app = angular.module("unverifiedModule", []);

app.controller("unverifiedCtrl", function($scope, electron, config, userService){
  $scope.logout = userService.logout;
  $scope.openExternalVerify = openExternalVerify;
  $scope.refreshUser = refreshUser;

  ////////////
  
  function openExternalVerify() {
    electron.shell.openExternal(config.externalUrl + "/");
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
