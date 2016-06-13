var app = angular.module("uploadServiceModule", []);

app.factory("uploadService", function($rootScope){
  return {
    cancelUpload: cancelUpload,
    abortUpload: abortUpload,
    pauseUpload: pauseUpload,
    resumeUpload: resumeUpload
  };
  
  ////////////////
  
  function cancelUpload(upload) {
    var uploadIndex;
    for (var i = 0; i < $rootScope.queuedUploads.length; i++) {
      if ($rootScope.queuedUploads[i].id === upload.id) {
        uploadIndex = i;
        break;
      }
    }
    if (uploadIndex) {
      $rootScope.queuedUploads.splice(i, 1);
    }
  }

  function abortUpload(upload) {
    
  }
  
  function pauseUpload(upload) {
    
  }
  
  function resumeUpload(upload) {
    
  }
  
});
