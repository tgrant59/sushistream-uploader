var app = angular.module("userServiceModule", []);

app.factory("userService", function($q, $http, $rootScope, $state, $location, $cookies, config, constants, uploadService, transcodeService){
  return {
    initUser: initUser, 
    logout: logout,
    sendToRightPage: sendToRightPage
  };
  
  //////////
  
  function initUser() {
    var deferred = $q.defer();
    $http.get(config.apiUrl + "/v1/user")
      .success(function(data){
        $rootScope.user = data.user;
        deferred.resolve();
      }).error(function(){
        $rootScope.user = null;
        deferred.reject();
      });
    return deferred.promise;
  }
  
  function logout(){
    uploadService.receiveUploadAbortAll();
    transcodeService.receiveTranscodingAbortAll();
    $rootScope.user = null;
    $rootScope.folder = null;
    $http.get(config.apiUrl + "/v1/auth/logout")
      .finally(function(){
        $cookies.remove("csrf-token");
        $cookies.remove("session-id");
        $location.url("/login");
      });
  }
  
  function sendToRightPage() {
    if (!$rootScope.user) {
      $state.go("login");
    } else if ($rootScope.user.role === constants.roles.unverified) {
      $state.go("unverified");
    } else if ($rootScope.user.role === constants.roles.unpaid) {
      $state.go("subscribe");
    } else {
      $state.go("dashboard");
    }
  }
  
});