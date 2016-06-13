var app = angular.module("uploadQueueModule", []);

app.directive("uploadQueue", function(){
  return {
    restrict: "E",
    controller: "uploadQueueCtrl",
    templateUrl: "pages/dashboard/upload-queue/upload-queue.html"
  };
});

app.controller("uploadQueueCtrl", function($scope, $rootScope, $timeout, constants, helpersService, uploadService, videoFolderNameReverseFilter){
  $scope.cancelUpload = uploadService.cancelUpload;
  $scope.abortUpload = uploadService.abortUpload;
  $scope.pauseUpload = uploadService.pauseUpload;
  $scope.resumeUpload = uploadService.resumeUpload;
  $scope.selectUpload = selectUpload;
  $rootScope.queuedUploads = [];

  // $timeout(function(){
  //   $rootScope.queuedUploads = [
  //     {id: helpersService.getRandomString(), localPath: "/Users/tom/Videos/Homevid_1", folder: $rootScope.folder,
  //       name: "Jaime and Cersei", status: "transcoding"},
  //     {id: helpersService.getRandomString(), localPath: "/Users/tom/Videos/Homevid/hella/basf/aiusehfow84h/sdgsdg4", folder: $rootScope.folder,
  //       name: "Abe Lincoln", status: "queued"}
  //   ];
  // }, 100);

  ////////

  function selectUpload(upload){
    $rootScope.selectedUpload = upload;
  }

  function updateUploadProgress(upload, progress) {
    $("#upload-" + upload.id).progress({
      value: progress
    });
  }

  // $timeout(function(){
  //   $scope.queuedUploads[0].status = "uploading";
  //   $scope.queuedUploads[1].status = "transcoding";
  //   updateUploadProgress($scope.queuedUploads[0], 3);
  // }, 3000);
  // $timeout(function(){
  //   updateUploadProgress($scope.queuedUploads[0], 15);
  // }, 5000);
  // $timeout(function(){
  //   updateUploadProgress($scope.queuedUploads[0], 27);
  // }, 7000);
  // $timeout(function(){
  //   updateUploadProgress($scope.queuedUploads[0], 45);
  // }, 10000);
  // $timeout(function(){
  //   updateUploadProgress($scope.queuedUploads[0], 54);
  // }, 12000);
  // $timeout(function(){
  //   updateUploadProgress($scope.queuedUploads[0], 75);
  // }, 13000);
  // $timeout(function(){
  //   updateUploadProgress($scope.queuedUploads[0], 94);
  // }, 15000);
  // $timeout(function(){
  //   $scope.queuedUploads[0].status = "finished";
  //   updateUploadProgress($scope.queuedUploads[0], 100);
  // }, 18000);

  // --------------- Drag and Drop ----------------
  var html = $("body");
  var uploadDimmer = $("#upload-dimmer");
  var stopDragOver;
  html.on("dragenter", dragOver);
  html.on("dragover", dragOver);
  html.on("dragleave", dragEnd);
  html.on("drop", dropFile);

  function preventDefault(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function dragOver(event){
    preventDefault(event);
    uploadDimmer.dimmer("show");
    if (stopDragOver) {
      $timeout.cancel(stopDragOver);
      stopDragOver = undefined;
    }
  }

  function dragEnd(event) {
    preventDefault(event);
    stopDragOver = $timeout(function(){
      uploadDimmer.dimmer("hide");
      stopDragOver = undefined;
    }, 10);
  }

  function nameIsDuplicate(name, folder) {
    for (var i = 0; i < folder.videos.length; i++) {
      if (name === folder.videos[i].name) {
        return true;
      }
    }
    return false;
  }

  function dropFile(event){
    dragEnd(event);
    var uploadFiles = event.originalEvent.dataTransfer.files;
    console.log(uploadFiles);
    for (var i = 0; i < uploadFiles.length; i++) {
      if (constants.regex.videoFormats.test(uploadFiles[i].name)) {
        var dotIndex = uploadFiles[i].name.lastIndexOf(".");
        var slashIndex = uploadFiles[i].name.lastIndexOf("/");
        var name = videoFolderNameReverseFilter(uploadFiles[i].name.substring(0, dotIndex));
        while (nameIsDuplicate(name, $rootScope.folder)) {
          name = name + " (1)";
        }
        $rootScope.queuedUploads.push({
          id: helpersService.getRandomString(),
          name: name,
          folder: $rootScope.folder,
          status: "queued",
          localPath: uploadFiles[i].name.slice(0, slashIndex),
          file: uploadFiles[i]
        });
      }
    }
  }

});
