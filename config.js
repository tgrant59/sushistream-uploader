const os = require("os");
var platform = os.platform();
var mainDir = __dirname
var tmpDir = mainDir + "/tmp"

// Determine ffmpeg and ffprobe filenames based on platform
var ffmpegFilename;
var ffprobeFilename;
if (platform === "osx" || platform === "darwin") {
  platform = platform + '_' + os.arch();
  ffmpegFilename = "SushiStreamTranscoder";
  ffprobeFilename = "SushiStreamProber";
} else {
  ffmpegFilename = "SushiStreamTranscoder.exe";
  ffprobeFilename = "SushiStreamProber.exe";
}

// Config Values
module.exports = {
  openDevTools: true,
  logging: true,
  indexPath: "file://" + __dirname + "/dist/index.html",
  tmpDir: tmpDir,
  transcodingDir: tmpDir + "/transcoding/",
  uploadDir: tmpDir + "/upload/",
  logfile: tmpDir + "/progress.log",
  externalSiteUrl: "https://sushistream.co",
  externalAppUrl: "http://localhost:7000/#",
  bin: {
    ffmpeg: {
      path: mainDir + "/bin/" + ffmpegFilename,
      preParams: ["-i"],
      postParams: ["-acodec", "aac", "-hls_list_size", "0", "-hls_time", "5", "-hls_segment_filename", tmpDir + "/transcoding/%05d.ts", tmpDir + "/transcoding/index.m3u8", "-progress", tmpDir + "/progress.log", "-loglevel", "quiet"]
    },
    ffprobe: {
      path: mainDir + "/bin/" + ffprobeFilename,
      preParams: ["-i"],
      postParams: ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames", "-of", "default=nokey=1:noprint_wrappers=1"]
    }
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
