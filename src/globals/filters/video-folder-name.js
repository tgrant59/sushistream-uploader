var app = angular.module("videoFolderNameFilterModule", []);

app.filter("videoFolderName", function(constants){
  var dotRegex = new RegExp(constants.mongoPlaceholders.dot, "g");
  var dollarRegex = new RegExp(constants.mongoPlaceholders.dollar, "g");

  return videoFolderNameFilter;

  /////////

  function videoFolderNameFilter(videoFolderName) {
    if (videoFolderName) {
      return videoFolderName.replace(dotRegex, ".").replace(dollarRegex, "$");
    }
  }
});

app.filter("videoFolderNameReverse", function(constants){
  var dotRegex = new RegExp("\\.", "g");
  var dollarRegex = new RegExp("\\$", "g");

  return videoFolderNameReverseFilter;

  /////////

  function videoFolderNameReverseFilter(videoFolderName) {
    if (videoFolderName) {
      return videoFolderName.replace(dotRegex, constants.mongoPlaceholders.dot).replace(dollarRegex, constants.mongoPlaceholders.dollar);
    }
  }
});
