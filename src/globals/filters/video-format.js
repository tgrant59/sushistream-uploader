var app = angular.module("videoFormatFilterModule", []);

app.filter("videoFormat", function() {
  return videoFormatFilter;
  
  //////////////
  
  function videoFormatFilter(format) {
    if (format) {
      console.log(format);
      return format.split("/")[1];
    }
  }
  
});
