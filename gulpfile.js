var gulp = require("gulp");
var concat = require("gulp-concat");
var del = require("del");
var sourcemaps = require("gulp-sourcemaps");
var cached = require("gulp-cached");
var watch = require("gulp-watch");
var webserver = require("gulp-webserver");
var gulpUtil = require("gulp-util");
var livereload = require("gulp-livereload");
var child_process = require("child_process");
// JS Stuff
var jshint = require("gulp-jshint");
var stylish = require("jshint-stylish");
var ngAnnotate = require("gulp-ng-annotate");
var insert = require("gulp-insert");
var uglify = require("gulp-uglify");
// CSS Stuff
var scsslint = require("gulp-scss-lint");
var sass = require("gulp-sass");
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var postcssFlexibility = require("postcss-flexibility");
var cssnano = require("cssnano");

var jsGlob = "src/**/*.js";
var scssGlob = "src/**/*.scss";
var htmlGlob = "src/**/*.html";
var thirdPartyLibsGlob = "libs/**/*";
var imageGlob = "img/**/*";
var binGlob = "bin/**/*";
var distGlob = "dist/**/*";


gulp.task("clean-html", function() {
  return del([
    "dist/**/*",
    "!dist/sushistream.min.js",
    "!dist/sushistream.min.css",
    "!dist/img",
    "!dist/img/**/*",
    "!dist/libs",
    "!dist/libs/**/*"
  ]);
});

gulp.task("clean-third-party", function() {
  return del(["dist/libs"]);
});

gulp.task("clean-images", function() {
  return del(["dist/img"]);
});

gulp.task("lint-js", function() {
  return gulp.src(jsGlob)
    .pipe(cached("jshint"))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter("fail"));
});

gulp.task("lint-scss", function() {
  return gulp.src(scssGlob)
    .pipe(cached("scsslint"))
    .pipe(scsslint({
      config: ".scsslint.yml"
    }))
    .pipe(scsslint.failReporter("E"));
});

gulp.task("distribute-js", ["lint-js"], function() {
  return gulp.src(jsGlob)
    .pipe(sourcemaps.init())
      .pipe(ngAnnotate())
      .pipe(insert.wrap("(function(){", "\n})();"))
      .pipe(concat("sushistream.min.js"))
      .pipe(uglify().on("error", gulpUtil.log))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("dist"));
});

gulp.task("distribute-scss", ["lint-scss"], function() {
  return gulp.src(scssGlob)
    .pipe(sourcemaps.init())
      .pipe(concat("sushistream.min.css"))
      .pipe(sass())
      .pipe(postcss([
          postcssFlexibility,
          autoprefixer,
          cssnano
      ]))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("dist"));
});

gulp.task("distribute-html", ["clean-html"], function() {
  return gulp.src(htmlGlob)
    .pipe(gulp.dest("dist"));
});

gulp.task("distribute-third-party", ["clean-third-party"], function() {
  return gulp.src(thirdPartyLibsGlob)
    .pipe(gulp.dest("dist/libs"));
});

gulp.task("distribute-images", ["clean-images"], function() {
  return gulp.src(imageGlob)
    .pipe(gulp.dest("dist/img"));
});

gulp.task("distribute-bin", function() {
  return gulp.src(binGlob)
    .pipe(gulp.dest("dist/bin"));
});

gulp.task("reload-contents", function() {
  return gulp.src(distGlob)
    .pipe(livereload());
});

var electron;
gulp.task("reload-electron", function(){
  if (electron) {
    electron.kill();
  }
  electron = child_process.spawn(__dirname + "/node_modules/electron-prebuilt/dist/Electron.app/Contents/MacOS/Electron", ["."]);
  electron.stdout.on('data', function(data) {
    console.log("Electron: " + data);
});
});

gulp.task("watch", ["distribute-js", "distribute-scss", "distribute-html", "distribute-third-party", "distribute-images"], function() {
  gulp.start("reload-electron");
  livereload.listen({
    port: 35000,
    quiet: true
  });
  watch(jsGlob, function() {
    gulp.start("distribute-js");
  });
  watch(scssGlob, function() {
    gulp.start("distribute-scss");
  });
  watch(htmlGlob, function() {
    gulp.start("distribute-html");
  });
  watch(thirdPartyLibsGlob, function() {
    gulp.start("distribute-third-party");
  });
  watch(imageGlob, function() {
    gulp.start("distribute-images");
  });
  watch(distGlob, function(){
    gulp.start("reload-contents");
  });
  watch(["main.js", "config.js"], function(){
    gulp.start("reload-electron");
  })
});

// gulp.task("serve", , function(){
//
// });

// gulp.task("serve", ["distribute-js", "distribute-scss", "distribute-html", "distribute-third-party", "distribute-images", "watch"], function() {
  // gulp.src("dist")
  //   .pipe(webserver({
  //     livereload: true,
  //     open: "http://localhost:6000",
  //     port: 7000
  //   }))
// });

// gulp.task("clean-production", function() {
//   return s3Delete();
// });

// gulp.task("production", ["distribute-js", "distribute-scss", "distribute-html", "distribute-third-party", "distribute-images", "clean-production"], function(){
//   gulp.src([
//     "dist/**/*.js",
//     "dist/**/*.css",
//     "dist/**/*.html",
//     "!dist/index.html"
//   ]).pipe(gzip())
//     .pipe(s3(awsConfig));
//
//   gulp.src("dist/index.html")
//     .pipe(replace("<script src="http://localhost:35729/livereload.js"></script>", ""))
//     .pipe(gzip())
//     .pipe(s3(awsConfig));
//
//   gulp.src([
//     "dist/**/*",
//     "!dist/**/*.js",
//     "!dist/**/*.css",
//     "!dist/**/*.html",
//     "!dist/index.html"
//   ]).pipe(s3(awsConfig))
//
// });

gulp.task("default", ["watch"]);
gulp.task("build", ["distribute-js", "distribute-scss", "distribute-html", "distribute-third-party", "distribute-images", "distribute-bin"]);
