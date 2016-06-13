var app = angular.module("userServiceModule", []);

app.factory("userService", function($q, $http, $rootScope, $location, $cookies, config){
  return {
    initUser: initUser, 
    logout: logout
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
    $rootScope.user = null;
    $http.get(config.apiUrl + "/v1/auth/logout")
      .finally(function(){
        $cookies.remove("csrf-token");
        $cookies.remove("session-id");
        $location.url("/login");
      });
  }
  
});