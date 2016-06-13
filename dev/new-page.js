var fs = require("fs");

if (process.argv.length < 3){
  console.log("Please provide a name for the new page");
  process.exit(1);
}
var path = "src/" + process.argv[2].replace(/\\/g, "/");
var tagList = process.argv[2].split(/[\/\\]+/);
var name = tagList[tagList.length-1];

try {
  fs.lstatSync(path);
  console.log("Page already exists.\n" +
    "Exiting...");
  process.exit(1);
} catch (e) {
  console.log("Creating page '" + name + "'...");
}

fs.mkdirSync(path);
fs.writeFileSync(path + "/" + name + ".html", "", {flag: "w+"});
fs.writeFileSync(path + "/" + name + ".scss", "", {flag: "w+"});

function capitalizeString(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}

var nameList = name.split("-");
for (var i = 1; i < nameList.length; i++) {
  nameList[i] = capitalizeString(nameList[i]);
}
var camelCaseName = nameList.join("");

var jsTemplate =
  'var app = angular.module("' + camelCaseName + 'Module", []);\n' +
  '\n' +
  'app.controller("' + camelCaseName + 'Ctrl", function($scope){\n' +
  '\n' +
  '});\n';
fs.writeFileSync(path + "/" + name + ".js", jsTemplate, {flag: "wx+"});

console.log("Success!");
console.log("New path: '" + path + "'");
console.log("Don't forget to inject your new page into your app and/or register the new route");
