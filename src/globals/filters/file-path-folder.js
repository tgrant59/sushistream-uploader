var app = angular.module("filePathFolderFilterModule", []);

app.filter("filePathFolder", function(){
  return filePathFolderFilter;

  /////////

  function filePathFolderFilter(filePath) {
    if (filePath) {
      return filePath.split("/").slice(0, -1).join("/") + "/";
    }
  }
});
