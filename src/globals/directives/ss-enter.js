var app = angular.module("ssEnterDirectiveModule", []);

app.directive("ssEnter", function() {
  return function(scope, element, attrs) {
    element.bind("keydown keypress", function(event) {
      if(event.which === 13) {
        scope.$apply(function(){
          scope.$eval(attrs.ssEnter, {'$event': event});
        });
        event.preventDefault();
      }
    });
  };
});