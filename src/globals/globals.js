var app = angular.module("globalsModule", [
  // Directives
  "ssEnterDirectiveModule",
  "ssRightClickDirectiveModule",
  // Filters
  "bytesFilterModule",
  "etaFilterModule",
  "filePathFolderFilterModule",
  "videoFolderNameFilterModule",
  "videoFormatFilterModule",
  // Services
  "backgroundProcessServiceModule",
  "csrfServiceModule",
  "helpersServiceModule",
  "transcodeServiceModule",
  "uploadServiceModule",
  "userServiceModule"
]);
