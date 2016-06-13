var app = angular.module("csrfServiceModule", []);

app.factory("csrfService", function($cookies){
  return {
    token: function(){
      var cookie = $cookies.get("csrf-token");
      return cookie ? cookie.replace(/"/g, "") : "";
    }
  };
});
