var app = angular.module("uploadInfoModule", []);

app.directive("uploadInfo", function(){
  return {
    restrict: "E",
    controller: "uploadInfoCtrl",
    templateUrl: "pages/dashboard/upload-info/upload-info.html"
  };
});

app.controller("uploadInfoCtrl", function($scope, uploadService){
  $scope.cancelUpload = uploadService.cancelUpload;
  $scope.abortUpload = uploadService.abortUpload;
  $scope.clearUpload = uploadService.clearUpload;
  $scope.pauseUpload = uploadService.pauseUpload;
  $scope.resumeUpload = uploadService.resumeUpload;
});
