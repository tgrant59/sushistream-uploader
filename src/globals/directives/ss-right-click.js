app = angular.module("ssRightClickDirectiveModule", []);

app.directive("ssRightClick", function($parse) {
  return function(scope, element, attrs) {
    var fn = $parse(attrs.ssRightClick);
    element.bind("contextmenu", function(event) {
      scope.$apply(function() {
        $(".dropdown").dropdown("hide");
        event.preventDefault();
        fn(scope, {$event:event});
        event.stopPropagation();
      });
    });
  };
});