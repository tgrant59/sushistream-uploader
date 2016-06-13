var app = angular.module("configModule", []);

app.constant("config", {
  withCredentials: true,
  apiUrl: "http://localhost:4000",
  externalUrl: "http://localhost:7000/#"
});
