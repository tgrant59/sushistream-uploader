var app = angular.module("uploadInfoModule", []);

app.directive("uploadInfo", function(){
  return {
    restrict: "E",
    controller: "uploadInfoCtrl",
    templateUrl: "pages/dashboard/upload-info/upload-info.html"
  };
});

app.controller("uploadInfoCtrl", function($scope, $rootScope, $http, uploadService, transcodeService, constants, config){
  $scope.cancelUpload = uploadService.cancelUpload;
  $scope.abortUpload = uploadService.abortUpload;
  $scope.pauseUpload = uploadService.pauseUpload;
  $scope.resumeUpload = uploadService.resumeUpload;
  $scope.abortTranscoding = transcodeService.abortTranscoding;
  $scope.changeName = changeName;
  $scope.updateFolder = updateFolder;
  // Form Validation
  var nameChangeForm = $("#name-change-form");
  nameChangeForm.form({
    fields: {
      newName: ["maxLength[256]"]
    }
  });
  
  ////////////////
  
  function changeName() {
    $scope.nameChangeError = false;
    if (nameChangeForm.form("is valid")) {
      var fields = nameChangeForm.form("get values");
      if (!fields.newName || fields.newName.length === 0) {
        return;
      }
      $scope.nameChangeLoading = true;
      if ($rootScope.selectedUpload.status !== constants.statuses.uploading) {
        $rootScope.selectedUpload.name = fields.newName;
        $scope.nameChangeLoading = false;
        nameChangeForm.form("reset");
      } else {
        var selectedUploadId = $rootScope.selectedUpload.id;
        var params = {
          path: $rootScope.selectedUpload.folder.path,
          key: $rootScope.selectedUpload.key,
          new_name: fields.newName
        };
        $http.put(config.apiUrl + "/v1/video", params)
          .success(function(){
            $rootScope.$broadcast("refresh-folder-structure");
            for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
              if ($rootScope.queuedUploads[i].id == selectedUploadId) {
                $rootScope.queuedUploads[i].name = fields.newName;
              }
            }
            nameChangeForm.form("reset");
          }).error(function(){
            $scope.nameChangeError = true;
          }).finally(function(){
            $scope.nameChangeLoading = false;
          });
      }
    }
  }

  function updateFolder() {
    $scope.updateFolderError = false;
    $scope.updateFolderLoading = true;
    if ($rootScope.selectedUpload.status !== constants.statuses.uploading) {
      $rootScope.selectedUpload.folder = $rootScope.folder;
      $scope.updateFolderLoading = false;
    } else {
      var selectedUploadId = $rootScope.selectedUpload.id;
      var newFolder = $rootScope.folder;
      var params = {
        path: $rootScope.selectedUpload.folder.path,
        key: $rootScope.selectedUpload.key,
        newPath: $rootScope.folder.path
      };
      $http.post(config.apiUrl + "/v1/video/move", params)
        .success(function(){
          $rootScope.$broadcast("refresh-folder-structure");
          for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
            if ($rootScope.queuedUploads[i].id == selectedUploadId) {
              $rootScope.queuedUploads[i].folder = newFolder;
            }
          }
        }).error(function(){
          $scope.updateFolderError = true;
        }).finally(function(){
          $scope.updateFolderLoading = false;
        });
    }
  }
  
});
