var app = angular.module("uploadQueueModule", []);

app.directive("uploadQueue", function(){
  return {
    restrict: "E",
    controller: "uploadQueueCtrl",
    templateUrl: "pages/dashboard/upload-queue/upload-queue.html"
  };
});

app.controller("uploadQueueCtrl", function($scope, $rootScope, $timeout, $interval, constants, helpersService, uploadService, transcodeService, videoFolderNameReverseFilter){
  $scope.cancelUpload = uploadService.cancelUpload;
  $scope.abortUpload = uploadService.abortUpload;
  $scope.pauseUpload = uploadService.pauseUpload;
  $scope.resumeUpload = uploadService.resumeUpload;
  $scope.abortTranscoding = transcodeService.abortTranscoding;
  $scope.selectUpload = selectUpload;
  $rootScope.queuedUploads = [];
  $interval(startTranscoding, 1000);

  ////////////////

  function selectUpload(upload){
    $rootScope.selectedUpload = upload;
  }

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
    var allVideos = folder.videos.concat($rootScope.queuedUploads);
    for (var i = 0; i < allVideos.length; i++) {
      if (name === allVideos[i].name) {
        return true;
      }
    }
    return false;
  }

  function dropFile(event){
    dragEnd(event);
    var uploadFiles = event.originalEvent.dataTransfer.files;
    for (var i = 0; i < uploadFiles.length; i++) {
      if (constants.regex.videoFormats.test(uploadFiles[i].name)) {
        var dotIndex = uploadFiles[i].name.lastIndexOf(".");
        var name = videoFolderNameReverseFilter(uploadFiles[i].name.substring(0, dotIndex));
        // For first duplication, add (1) to end of name
        if (nameIsDuplicate(name, $rootScope.folder)) {
          name = name + " (1)";
        }
        // For subsequent duplications, increment number
        var j = 2;
        while (nameIsDuplicate(name, $rootScope.folder)) {
          name = name.slice(0, -3) + "(" + j.toString() + ")";
          j++;
        }
        $rootScope.queuedUploads.push({
          id: helpersService.getRandomString(),
          name: name,
          folder: $rootScope.folder,
          status: constants.statuses.queued,
          file: uploadFiles[i]
        });
      }
    }
  }

  function startTranscoding() {
    var i = 0;
    while (i < $rootScope.queuedUploads.length) {
      if ($rootScope.queuedUploads[i].status === constants.statuses.transcoding) {
        break;
      } else if ($rootScope.queuedUploads[i].status === constants.statuses.queued) {
        transcodeService.startTranscoding($rootScope.queuedUploads[i]);
        break;
      }
      i++;
    }
  }
  
});
