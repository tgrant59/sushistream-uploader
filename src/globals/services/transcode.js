var app = angular.module("transcodeServiceModule", []);

app.factory("transcodeService", function($rootScope, $timeout, ipc, constants){
  return {
    startTranscoding: startTranscoding,
    abortTranscoding: abortTranscoding,
    updateTranscodingFrames: updateTranscodingFrames,
    updateTranscodingProgressFrames: updateTranscodingProgressFrames,
    updateTranscodingProgressFps: updateTranscodingProgressFps,
    receiveTranscodingError: receiveTranscodingError
  };

  ///////////////

  function startTranscoding(video) {
    video.status = constants.statuses.transcoding;
    $timeout(function () {
      $("#transcoding-" + video.id).progress({
        value: 0
      });
    });
    ipc.send({
      event: "transcoding-frames",
      msg: {
        id: video.id,
        path: video.file.path
      }
    });
    ipc.send({
      event: "transcoding-start",
      msg: {
        id: video.id,
        path: video.file.path
      }
    });
  }

  function abortTranscoding(video) {
    video.status = constants.statuses.aborted;
    delete video.total_frames;
    delete video.frames;
    delete video.fps;
    delete video.eta;
    ipc.send({
      event: "transcoding-abort",
      msg: {
        id: video.id
      }
    });
  }

  function _update_progress(video) {
    if (video.frames && video.total_frames && video.fps) {
      var progress = (video.frames / video.total_frames) * 100;
      video.eta = (video.total_frames - video.frames) / video.fps;
      $("#transcoding-" + video.id).progress({
        value: progress
      });
    }
  }
  
  //// Event Handlers
  
  function updateTranscodingFrames(msg) {
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        $rootScope.queuedUploads[i].total_frames = msg.frames;
      }
    }
  }

  function updateTranscodingProgressFrames(msg) {
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        $rootScope.queuedUploads[i].frames = msg.frames;
        _update_progress($rootScope.queuedUploads[i]);
      }
    }
  }

  function updateTranscodingProgressFps(msg) {
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        $rootScope.queuedUploads[i].fps = msg.fps;
        _update_progress($rootScope.queuedUploads[i]);
      }
    }
  }
  
  function receiveTranscodingError(msg) {
    console.log(msg.err);
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        $rootScope.queuedUploads[i].status = constants.statuses.error;
      }
    }
  }
  
  function receiveTranscodingAbort(msg) {
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id == msg.id) {
        $rootScope.queuedUploads[i].status = constants.statuses.aborted;
      }
    }
  }

});
