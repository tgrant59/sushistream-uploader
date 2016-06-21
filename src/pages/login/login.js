var app = angular.module("loginModule", []);

app.controller("loginCtrl", function($scope, $rootScope, $http, $location, $state, $stateParams, electron, config, constants, userService){
  // Functions
  $scope.loginFormSubmit = loginFormSubmit;
  $scope.openExternalLogin = openExternalLogin;
  // Form Validation
  var loginForm = $("#login-form");
  loginForm.form({
    fields: {
      loginEmail: ["email", "maxLength[256]"],
      loginPassword: ["minLength[8]", "maxLength[256]"]
    }
  });

  ////////////
  
  function loginFormSubmit() {
    $scope.loginFormError = false;
    $scope.loginPasswordIncorrect = false;
    $scope.loginEmailIncorrect = false;
    $scope.loginUnspecifiedError = false;
    if (loginForm.form("is valid")) {
      $scope.loginFormLoading = true;
      var fields = loginForm.form('get values');
      var payload = {
        email: fields.loginEmail,
        password: fields.loginPassword,
        remember_me: true
      };
      $http.post(config.apiUrl + "/v1/auth/login", payload)
        .success(function(){
          $rootScope.user = undefined;  // Needed to reset the user to an unknown login state
          userService.initUser()
            .then(function(){
              if ($rootScope.user.role === constants.roles.unverified) {
                $state.go("unverified");
              } else if ($rootScope.user.role === constants.roles.unpaid) {
                $state.go("subscribe");
              }
              $state.go("dashboard");
            });
        }).error(function(data, status){
          $scope.loginFormError = true;
          if (status === 401){
            loginForm.form("set value", "loginPassword", "");
            if (data && data.title === "Incorrect Password"){
              $scope.loginPasswordIncorrect = true;
            } else if (data && data.title === "User Not Found"){
              $scope.loginEmailIncorrect = true;
              loginForm.form("set value", "loginEmail", "");
            } else {
              $scope.loginUnspecifiedError = true;
            }
          } else {
            $scope.loginUnspecifiedError = true;
          }
        }).finally(function(){
          $scope.loginFormLoading = false;
        });
    }
  }

  function openExternalLogin() {
    electron.shell.openExternal(config.externalUrl + "/login");
  }

});
