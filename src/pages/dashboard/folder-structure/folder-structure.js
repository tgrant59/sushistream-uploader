var app = angular.module("folderStructureModule", []);

app.directive("folderStructure", function(){
  return {
    restrict: "E",
    controller: "folderStructureCtrl",
    templateUrl: "pages/dashboard/folder-structure/folder-structure.html"
  };
});

app.controller("folderStructureCtrl", function($scope, $rootScope, $http, $q, $timeout, $interval, constants, config){
  // Init Modals
  var videoRenameModal;
  var videoDeleteModal;
  var folderRenameModal;
  var folderCreateModal;
  var folderDeleteModal;
  var moveModal;
  $timeout(function(){
    videoRenameModal = $("#video-rename-modal");
    videoRenameModal.modal({onApprove: function(){return false;}});
    videoDeleteModal = $("#video-delete-modal");
    videoDeleteModal.modal({onApprove: function(){return false;}});
    folderRenameModal = $("#folder-rename-modal");
    folderRenameModal.modal({onApprove: function(){return false;}});
    folderCreateModal = $("#folder-create-modal");
    folderCreateModal.modal({onApprove: function(){return false;}});
    folderDeleteModal = $("#folder-delete-modal");
    folderDeleteModal.modal({onApprove: function(){return false;}});
    moveModal = $("#move-modal");
    moveModal.modal({onApprove: function(){return false;}});
  });


  // Init folder structure
  var baseFolder;
  loadBaseFolder();
  $interval(function(){
    loadBaseFolder();
  }, constants.timing.folderStructureRefreshInterval);

  // Init scope functions
  // $scope.playVideo = playerService.playVideo;
  $scope.loadBaseFolder = loadBaseFolder;
  $scope.navToPath = navToPath;
  $scope.openVideoContextMenu = openVideoContextMenu;
  $scope.openFolderContextMenu = openFolderContextMenu;
  $scope.openGenericContextMenu = openGenericContextMenu;
  $scope.openVideoRenameModal = openVideoRenameModal;
  $scope.openVideoDeleteModal = openVideoDeleteModal;
  $scope.openFolderRenameModal = openFolderRenameModal;
  $scope.openFolderCreateModal = openFolderCreateModal;
  $scope.openFolderDeleteModal = openFolderDeleteModal;
  $scope.renameVideo = renameVideo;
  $scope.deleteVideo = deleteVideo;
  $scope.createFolder = createFolder;
  $scope.renameFolder = renameFolder;
  $scope.deleteFolder = deleteFolder;
  $scope.cutVideo = cutVideo;
  $scope.cutFolder = cutFolder;
  $scope.paste = paste;

  /////////////////

  // ------------- Generating and Navigating the Folder Structure  --------------
  function loadBaseFolder() {
    var deferred = $q.defer();
    $scope.clippedFolder = null;
    $scope.clippedVideo = null;
    $scope.error = false;
    $scope.loadingFolder = true;
    $http.get(config.apiUrl + "/v1/folder")
      .success(function(data){
        baseFolder = JSON.parse(data.folder);
        var path;
        if ($rootScope.folder) {
          path = $rootScope.folder.path;
        }
        $rootScope.folder = baseFolder;
        if (path) {
          navToPath(path);
        }
        deferred.resolve();
      }).error(function(){
        $scope.error = true;
        deferred.reject();
      }).finally(function(){
        $scope.loadingFolder = false;
      });
    return deferred.promise;
  }

  function _followPath(folder, path) {
    if (path.length > 0) {
      return _followPath(folder.folders[path[0]], path.slice(1));
    } else {
      return folder;
    }
  }

  function navToPath(path) {
    try {
      $rootScope.folder = _followPath(baseFolder, path);
    } catch(err) {
      $rootScope.folder = baseFolder;
    }
  }

  // -------------- Context Menus --------------
  function openVideoContextMenu(video, event){
    $scope.videoToModify = video;
    var offset = $("#video-explorer").offset();
    var videoContextMenu = $("#video-context-menu");
    videoContextMenu.css("left", event.pageX - offset.left);
    videoContextMenu.css("top", event.pageY - offset.top);
    videoContextMenu.dropdown("show");
  }

  function openFolderContextMenu(folder, event){
    $scope.folderToModify = folder;
    var offset = $("#video-explorer").offset();
    var folderContextMenu = $("#folder-context-menu");
    folderContextMenu.css("left", event.pageX - offset.left);
    folderContextMenu.css("top", event.pageY - offset.top);
    folderContextMenu.dropdown("show");
  }

  function openGenericContextMenu(event){
    var offset = $("#video-explorer").offset();
    var genericContextMenu = $("#generic-context-menu");
    genericContextMenu.css("left", event.pageX - offset.left);
    genericContextMenu.css("top", event.pageY - offset.top);
    genericContextMenu.dropdown("show");
  }

  // -------------- Modals --------------
  function openVideoRenameModal() {
    $scope.videoNewName = "";
    $scope.renameVideoInvalidLength = false;
    $scope.renameVideoError = false;
    $scope.renamingVideo = false;
    videoRenameModal.modal("show");
  }

  function openVideoDeleteModal() {
    $scope.deleteVideoError = false;
    $scope.deletingVideo = false;
    videoDeleteModal.modal("show");
  }

  function openFolderRenameModal() {
    $scope.folderNewName = "";
    $scope.renameFolderInvalidLength = false;
    $scope.renameFolderError = false;
    $scope.renamingFolder = false;
    folderRenameModal.modal("show");
  }

  function openFolderCreateModal() {
    $scope.newFolderName = "";
    $scope.createFolderInvalidLength = false;
    $scope.createFolderError = false;
    $scope.creatingFolder = false;
    folderCreateModal.modal("show");
  }

  function openFolderDeleteModal() {
    $scope.deleteFolderError = false;
    $scope.deletingFolder = false;
    folderDeleteModal.modal("show");
  }

  // -------------- Video Interactions --------------
  function renameVideo(video, newName) {
    if (newName.length === 0 || newName.length > 256) {
      $scope.renameVideoInvalidLength = true;
      return;
    }
    $scope.renameVideoInvalidLength = false;
    $scope.renameVideoError = false;
    $scope.renamingVideo = true;
    var params = {
      path: $rootScope.folder.path,
      key: video.key,
      new_name: newName
    };
    $http.put(config.apiUrl + '/v1/video', params)
      .success(function() {
        loadBaseFolder()
          .then(function(){
            videoRenameModal.modal("hide");
          });
      }).error(function(){
        $scope.renameVideoError = true;
      }).finally(function(){
        $scope.renamingVideo = false;
      });
  }

  function deleteVideo(video) {
    $scope.deleteVideoError = false;
    $scope.deletingVideo = true;
    var params = {
      path: $rootScope.folder.path,
      key: video.key
    };
    $http.post(config.apiUrl + '/v1/video/delete', params)
      .success(function() {
        loadBaseFolder()
          .then(function(){
            videoDeleteModal.modal("hide");
          });
      }).error(function(){
        $scope.deleteVideoError = true;
      }).finally(function(){
        $scope.deletingVideo = false;
      });
  }

  function moveVideo(video, newPath) {
    $scope.moveError = false;
    $scope.moving = true;
    var params = {
      path: $scope.clippedPath,
      key: video.key,
      new_path: newPath
    };
    $http.post(config.apiUrl + "/v1/video/move", params)
      .success(function(){
        loadBaseFolder()
          .then(function(){
            moveModal.modal("hide");
          });
      }).error(function(){
        $scope.moveError = true;
      }).finally(function(){
        $scope.moving = false;
      });
  }

  // -------------- Folder Interactions -------------
  function createFolder(name) {
    if (name.length === 0 || name.length > 256) {
      $scope.createFolderInvalidLength = true;
      return;
    }
    $scope.createFolderInvalidLength = false;
    $scope.createFolderError = false;
    $scope.creatingFolder = true;
    var params = {
      path: $rootScope.folder.path,
      name: name
    };
    $http.post(config.apiUrl + '/v1/folder', params)
      .success(function() {
        loadBaseFolder()
          .then(function(){
            folderCreateModal.modal("hide");
          });
      }).error(function(){
        $scope.createFolderError = true;
      }).finally(function(){
        $scope.creatingFolder = false;
      });
  }

  function renameFolder(folder, newName) {
    if (newName.length === 0 || newName.length > 256) {
      $scope.renameFolderInvalidLength = true;
      return;
    }
    $scope.renameFolderInvalidLength = false;
    $scope.renameFolderError = false;
    $scope.renamingFolder = true;
    var params = {
      path: $rootScope.folder.path,
      name: folder.name,
      new_name: newName
    };
    $http.put(config.apiUrl + '/v1/folder', params)
      .success(function() {
        loadBaseFolder()
          .then(function(){
            folderRenameModal.modal("hide");
          });
      }).error(function(){
        $scope.renameFolderError = true;
      }).finally(function(){
        $scope.renamingFolder = false;
      });
  }

  function deleteFolder(folder) {
    $scope.deleteFolderError = false;
    $scope.deletingFolder = true;
    var params = {
      path: $rootScope.folder.path,
      name: folder.name
    };
    $http.post(config.apiUrl + "/v1/folder/delete", params)
      .success(function() {
        loadBaseFolder()
          .then(function(){
            folderDeleteModal.modal("hide");
          });
      }).error(function(){
        $scope.deleteFolderError = true;
      }).finally(function(){
        $scope.deletingFolder = false;
      });
  }

  function
  moveFolder(folder, newPath) {
    $scope.moveError = false;
    $scope.moving = true;
    var params = {
      path: $scope.clippedPath,
      name: folder.name,
      new_path: newPath
    };
    $http.post(config.apiUrl + "/v1/folder/move", params)
      .success(function(){
        loadBaseFolder()
          .then(function(){
            moveModal.modal("hide");
          });
      }).error(function(){
        $scope.moveError = true;
      }).finally(function(){
        $scope.moving = false;
      });
  }

  // -------------- Cut + Paste --------------
  function cutVideo() {
    $scope.clippedPath = $rootScope.folder.path;
    $scope.clippedVideo = $scope.videoToModify;
    $scope.clippedFolder = null;
  }

  function cutFolder() {
    $scope.clippedPath = $rootScope.folder.path;
    $scope.clippedFolder = $scope.folderToModify;
    $scope.clippedVideo = null;
  }

  function paste() {
    $scope.clippedDestination = $rootScope.folder.path.length > 0 ? $rootScope.folder.path[-1] : "Home";
    if ($scope.clippedVideo) {
      $scope.clippedName = $scope.clippedVideo.name + " (video)";
      moveVideo($scope.clippedVideo, $rootScope.folder.path);
    } else if ($scope.clippedFolder) {
      $scope.clippedName = $scope.clippedFolder.name + " (folder)";
      moveFolder($scope.clippedFolder, $rootScope.folder.path);
    }
    $scope.clippedVideo = null;
    $scope.clippedFolder = null;
  }

});
