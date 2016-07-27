var app = angular.module("configModule", []);

app.constant("config", {
  withCredentials: true,
  apiUrl: "http://localhost:4000",
  externalUrl: "http://localhost:7000/#",
  backgroundProcessModulePath: "../background",
  concurrentUploadShards: 1,
  stripePlans: {
    "micro-monthly": {maxSize: 100000000000},
    "micro-annual": {maxSize: 100000000000},
    "small-monthly": {maxSize: 250000000000},
    "small-annual": {maxSize: 250000000000},
    "medium-monthly": {maxSize: 500000000000},
    "medium-annual": {maxSize: 500000000000},
    "large-monthly": {maxSize: 1000000000000},
    "large-annual": {maxSize: 1000000000000},
    "jumbo-monthly": {maxSize: 2000000000000},
    "jumbo-annual": {maxSize: 2000000000000}
  }
});
