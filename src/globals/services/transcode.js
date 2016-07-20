var app = angular.module("transcodeServiceModule", []);

app.factory("transcodeService", function($rootScope, $timeout, $interval, constants, backgroundProcessService){
  var frameCheckerInterval;
  return {
    startTranscoding: startTranscoding,
    abortTranscoding: abortTranscoding
  };

  ///////////////

  function startTranscoding(video) {
    video.status = constants.statuses.transcoding;
    $timeout(function () {
      $("#transcoding-" + video.id).progress({
        value: 0
      });
    });
    var videoMsg = {
      id: video.id,
      path: video.file.path
    };
    backgroundProcessService.getVideoFrames(videoMsg, function(msg){
      if (msg.error || msg.frames === 0) {
        setProgressNoFrames(video);
      } else {
        video.total_frames = msg.frames;
        frameCheckerInterval = $interval(function(){
          updateProgress(video);
        }, 2000);
      }
    });
    backgroundProcessService.startTranscoding(videoMsg, function(msg){
      $interval.cancel(frameCheckerInterval);
      delete video.total_frames;
      delete video.eta;
      if (msg.error) {
        video.status = constants.statuses.error;
      } else {
        video.shardsToUpload = msg.shardsToUpload;
        video.newSize = msg.size;
        video.status = constants.statuses.queuedUpload;
      }
    });
  }

  function abortTranscoding(video) {
    video.status = constants.statuses.aborted;
    $interval.cancel(frameCheckerInterval);
    delete video.total_frames;
    delete video.eta;
    backgroundProcessService.abortTranscoding(video);
  }

  function setProgressNoFrames(video) {
    $timeout(function() {
      var progressBar = $("#transcoding-" + video.id);
      progressBar.addClass("full-width");
      progressBar.progress("set bar label", "Transcoding...");
      progressBar.progress("set active");
    }, 1000);
  }

  function updateProgress(video) {
    backgroundProcessService.checkProgress(video)
      .then(function(msg){
        if (video.total_frames && msg.frames && msg.fps) {
          var progressBar = $("#transcoding-" + video.id);
          var progress = (msg.frames / video.total_frames) * 100;
          if (progress > 100) {
            $interval.cancel(frameCheckerInterval);
            progressBar.progress("reset");
            delete video.eta;
            setProgressNoFrames(video);
          } else {
            video.eta = (video.total_frames - msg.frames) / msg.fps;
            progressBar.progress({
              value: progress
            });
          }
        }
      });
  }
  
});
