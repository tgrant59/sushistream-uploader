const os = require("os");
var platform = os.platform();
var ffmpegFilename;
var ffprobeFilename;
if (platform === "osx" || platform === "darwin") {
  platform = platform + '_' + os.arch();
  ffmpegFilename = "ffmpeg";
  ffprobeFilename = "ffprobe";
} else {
  ffmpegFilename = "ffmpeg.exe";
  ffprobeFilename = "ffprobe.exe";
}

module.exports = {
  indexPath: "file://" + __dirname + "/dist/index.html",
  tmpDir: __dirname + "/tmp",
  openDevTools: true,
  externalSiteUrl: "https://sushistream.co",
  externalAppUrl: "http://localhost:7000/#",
  binFilenames: {
    ffmpeg: ffmpegFilename,
    ffprobe: ffprobeFilename
  },
  autoUpdater: {
    start: false,
    url: "https://uploader.sushistream.co/update/" + platform + "/"
  },
  crashReporter: {
    start: false,
    productName: "SushiStream Uploader",
    companyName: "SushiStream",
    submitURL: "https://uploader.sushistream.co/breakpad",
    autoSubmit: true
  }
};