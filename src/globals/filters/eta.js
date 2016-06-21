var app = angular.module("etaFilterModule", []);

app.filter("eta", function() {
  return function(total_seconds) {
    var hours = Math.floor(total_seconds / 3600);
    var minutes = Math.floor(total_seconds / 60);
    if (hours > 0) {
      return hours.toString() + "h " + minutes.toString() + "m";
    }
    var seconds = Math.ceil(total_seconds % 60);
    if (minutes > 0) {
      return minutes.toString() + "m " + seconds.toString() + "s";
    }
    return seconds.toString() + "s";
  };
});
