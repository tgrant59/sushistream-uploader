var app = angular.module("globalsModule", [
  // Directives
  "ssEnterDirectiveModule",
  "ssRightClickDirectiveModule",
  // Filters
  "bytesFilterModule",
  "videoFolderNameFilterModule",
  "videoFormatFilterModule",
  // Services
  "csrfServiceModule",
  "helpersServiceModule",
  "uploadServiceModule",
  "userServiceModule"
]);
