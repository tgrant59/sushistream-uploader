var app = angular.module("bytesFilterModule", []);

app.filter('bytes', function() {
  return function(bytes, precision) {
    if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes === 0) return "--";
    if (typeof precision === 'undefined') precision = 1;
    var units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    var number = Math.floor(Math.log(bytes) / Math.log(1000));
    return (bytes / Math.pow(1000, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
  };
});