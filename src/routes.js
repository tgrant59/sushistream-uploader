var app = angular.module("routesModule", []);

app.config(function($stateProvider, $urlRouterProvider, $httpProvider, config, constants) {
  $stateProvider
    .state("login", {
      url: "/login",
      templateUrl: "pages/login/login.html",
      controller: "loginCtrl",
      resolve: {
        authenticated: authenticated([], true)
      }
    })
    .state("dashboard", {
      url: "/",
      templateUrl: "pages/dashboard/dashboard.html",
      controller: "dashboardCtrl",
      resolve: {
        authenticated: authenticated([constants.roles.paid, constants.roles.cancelled])
      }
    })
    .state("subscribe", {
      url: "/subscribe",
      templateUrl: "pages/subscribe/subscribe.html",
      controller: "subscribeCtrl",
      resolve: {
        authenticated: authenticated([constants.roles.unpaid, constants.roles.unverified])
      }
    })
    .state("unverified", {
      url: "/unverified",
      templateUrl: "pages/unverified/unverified.html",
      controller: "unverifiedCtrl",
      resolve: {
        authenticated: authenticated([constants.roles.unverified])
      }
    })
    .state("update", {
      url: "/update",
      abstract: true,
      templateUrl: "pages/update/update.html",
      controller: "updateCtrl",
      resolve: {
        authenticated: authenticated([constants.roles.unverified, constants.roles.unpaid, constants.roles.paid, constants.roles.cancelled])
      }
    })
    .state("update.checking", {
      url: "/update/checking",
      templateUrl: "pages/update/update-checking/update-checking.html",
      controller: "updateCheckingCtrl"
    })
    .state("update.found", {
      url: "/update/found",
      templateUrl: "pages/update/update-found/update-found.html",
      controller: "updateFoundCtrl"
    })
    .state("update.notFound", {
      url: "/update/not-found",
      templateUrl: "pages/update/update-not-found/update-not-found.html",
      controller: "updateNotFoundCtrl"
    });

  $urlRouterProvider.when("", "/");
  $urlRouterProvider.otherwise("/");
  $httpProvider.interceptors.push(authInterceptor);
  $httpProvider.defaults.withCredentials = config.withCredentials;
});

// Authentication functions
//----------------------------------------------------------------------
var authInterceptor = function($q, $location, $rootScope) {
  return {
    'responseError': function(rejection) {
      if (rejection.status == 401) {
        if ($rootScope.user !== undefined) {
          $rootScope.user = null;
          var currentUrl = $location.url();
          $location.url("/login").search("next", currentUrl).replace();
        } else {
          $rootScope.user = null;
        }
      } else if (rejection.status == 403) {
        $location.url("/");
      }
      return $q.reject(rejection);
    }
  };
};

function authenticated(roles, notLoggedIn){
  return ["$rootScope", "$location", "constants", function($rootScope, $location, constants) {
    // reset topBar to enabled after login page
    // $rootScope.topBarDisabled = false;

    function checkAuth(user){
      if (user) {
        // if user is unverified, all they should see is the email verification page
        if (user.role === constants.roles.unverified) {
          $location.url("/unverified");
        }
        else if (user.role === constants.roles.unpaid) {
          $location.url("/subscribe");
        }
        // if you should not be seeing this page when logged in, redirect to homepage
        else if (notLoggedIn){
          $location.url("/");
        }
        // Checking page authorization
        else if (roles.length > 0 && roles.indexOf(user.role) < 0){
          $location.url("/");
        }
      // if user is not logged in
      } else if (user === null){
        // redirect to login if the page requires authentication
        if (roles.length > 0 && $location.path() !== "/login"){
          $location.path("/login");
        }
      } else {  // user is undefined
        return false;
      }
      return true;  // user is not undefined
    }
    // if user is undefined
    if (!checkAuth($rootScope.user)) {
      var destroyWatcher = $rootScope.$watch("user", function(user){
        if (user !== undefined){
          destroyWatcher();
          checkAuth(user);
        }
      });
    }
  }];
}
//-----------------------------------------------------------------------
