var app = angular.module("uploadServiceModule", []);

app.factory("uploadService", function($rootScope, $http, $interval, ipc, constants, config){
  var uploadFinishedChecker;
  var videoUploading;
  var shardsUploading = [];

  $interval(function(){
    if (!videoUploading && $rootScope.queuedUploads) {
      for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
        if ($rootScope.queuedUploads[i].status === constants.statuses.queuedUpload) {
          startUpload($rootScope.queuedUploads[i]);
          break;
        }
      }
    }
  }, 500);

  return {
    startUpload: startUpload,
    cancelUpload: cancelUpload,
    abortUpload: abortUpload,
    pauseUpload: pauseUpload,
    resumeUpload: resumeUpload,
    loadShards: loadShards,
    receiveUploadSuccess: receiveUploadSuccess,
    receiveUploadError: receiveUploadError
  };
  
  ////////////////
  
  function startUpload(video) {
    console.log(video);
    videoUploading = video;
    video.status = constants.statuses.uploading;
    var params = {
      path: video.folder.path,
      name: video.name,
      size: video.newSize
    };
    $http.post(config.apiUrl + "/v1/video/upload", params)
      .success(function(data){
        video.key = data.key;
        uploadVideoFiles(video);
        $rootScope.$broadcast("refresh-folder-structure");
      }).error(function(){
        video.status = constants.statuses.error;
      });
  }
  
  function cancelUpload(video) {
    if (video.status === constants.statuses.uploading) {
      abortUpload(video);
    } else {
      var videoIndex = $rootScope.queuedUploads.indexOf(video);
      if (videoIndex > -1) {
        if ($rootScope.selectedUpload && $rootScope.selectedUpload.id === $rootScope.queuedUploads[videoIndex].id) {
          $rootScope.selectedUpload = undefined;
        }
        $rootScope.queuedUploads.splice(videoIndex, 1);
      }
    }
  }

  function abortUpload(video) {
    if (videoUploading && videoUploading.id === video.id) {
      video.status = constants.statuses.aborted;
      delete video.shardsToUpload;
      shardsUploading = [];
      videoUploading = null;
      if (uploadFinishedChecker) {
        clearInterval(uploadFinishedChecker);
        uploadFinishedChecker = null;
      }
      var params = {
        path: video.folder.path,
        key: video.key
      };
      $http.post(config.apiUrl + '/v1/video/delete', params)
        .finally(function(){
          $rootScope.$broadcast("refresh-folder-structure");
        });
    }
  }

  function completeUpload(video) {
    video.status = constants.statuses.finished;
    delete video.shardsToUpload;
    shardsUploading = [];
    videoUploading = null;
    var params = {
      path: video.folder.path,
      key: video.key
    };
    $http.post(config.apiUrl + "/v1/video/upload/complete", params)
      .finally(function(){
        $rootScope.$broadcast("refresh-folder-structure");
      });
  }
  
  function pauseUpload(video) {
    if (video.id === videoUploading.id) {
      video.paused = true;
    }
  }
  
  function resumeUpload(video) {
    if (video.id === videoUploading.id) {
      video.paused = false;
    }
  }

  function loadShards(msg) {
    console.log(msg);
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        delete $rootScope.queuedUploads[i].total_frames;
        delete $rootScope.queuedUploads[i].frames;
        delete $rootScope.queuedUploads[i].fps;
        delete $rootScope.queuedUploads[i].eta;
        if (msg.error) {
          $rootScope.queuedUploads[i].status = constants.statuses.error;
        } else {
          $rootScope.queuedUploads[i].shardsToUpload = msg.shardsToUpload;
          $rootScope.queuedUploads[i].newSize = msg.size;
          $rootScope.queuedUploads[i].status = constants.statuses.queuedUpload;
        }
      }
    }
  }

  //// Helpers

  function uploadVideoFiles(video) {
    $("#upload-" + video.id).progress({
      total: video.shardsToUpload.length
    });
    uploadFinishedChecker = setInterval(function(){
      if (video.shardsToUpload.length === 0 && shardsUploading.length === 0) {
        clearInterval(uploadFinishedChecker);
        uploadFinishedChecker = null;
        completeUpload(video);
      } else if (shardsUploading.length < 3 && !video.paused) {
        var i = 0;
        while (shardsUploading.length < 3 && i < video.shardsToUpload.length) {
          shardsUploading.push(video.shardsToUpload[i]);
          var params = {
            key: video.key,
            filename: video.shardsToUpload[i]
          };
          $http.post(config.apiUrl + '/v1/video/upload/auth', params)
            .success(function(data){  // jshint ignore:line
              ipc.send({
                event: "upload-shard",
                msg: {
                  id: video.id,
                  file: data.filename,
                  signedUrl: data.presigned_url_data
                }
              });
            });
          i++;
        }
        video.shardsToUpload = video.shardsToUpload.slice(i);
      }
    }, 500);
  }

  //// Event listeners

  function receiveUploadSuccess(msg) {
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        var shardIndex = shardsUploading.indexOf(msg.file);
        shardsUploading.splice(shardIndex, 1);
        $("#upload-" + $rootScope.queuedUploads[i].id).progress("increment");
      }
    }
  }

  function receiveUploadError(msg) {
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        abortUpload($rootScope.queuedUploads[i]);
        $rootScope.queuedUploads[i].status = constants.statuses.error;
      }
    }
  }
  
});
