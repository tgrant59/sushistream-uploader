var app = angular.module("helpersServiceModule", []);

app.factory("helpersService", function(){
  return {
    getRandomString: getRandomString
  };
  
  ////////////
  
  function getRandomString() {
    return (Math.random()*1e32).toString(36);
  }
  
});
