const child_process = require("child_process");
const util = require('util');
const fs = require("fs-extra");
const readlines = require("n-readlines");
const request = require("superagent");
const config = require("./config");

process.setMaxListeners(100);
let transcoder;
let transcoderVideoId;
let frameChecker;

// Create logfile
fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});

// ---------------------------------------------------------------------------------------------------------------------
//                                                    Transcoding
// ---------------------------------------------------------------------------------------------------------------------
removeSync(config.tmpDir);
fs.mkdirSync(config.tmpDir);
fs.mkdirSync(config.uploadDir);

function getVideoFrames(video, callback) {
  var ffprobeParams = config.bin.ffprobe.preParams.concat([video.path]).concat(config.bin.ffprobe.postParams);
  child_process.execFile(config.bin.ffprobe.path, ffprobeParams, function(err, stdout, stderr){
    var msg = {};
    if (err) {
      log(err, "ffprobe child_process");
      msg.error = true;
    } else {
      try {
        msg.frames = parseInt(stdout);
      } catch (err) {
        log(err, "ffprobe parseInt");
        msg.error = true;
      }
    }
    callback(msg);
  });
}

function startTranscoding(video, callback) {
  if (transcoder) {
    transcoder.kill();
  }
  transcoderVideoId = video.id;
  removeSync(config.transcodingDir);
  fs.mkdirSync(config.transcodingDir);
  var ffmpegParams = config.bin.ffmpeg.preParams.concat([video.path]).concat(config.bin.ffmpeg.postParams);

  transcoder = child_process.execFile(config.bin.ffmpeg.path, ffmpegParams, {maxBuffer: 10000 * 1024}, function(err) {
    removeSync(config.logfile);
    transcoder = null;
    transcoderVideoId = null;
    var msg = {};
    if (err) {
      log(err, "transcoder child_process");
      removeSync(config.transcodingDir);
      msg.error = true;
      if (!err.killed) {
        callback(msg);
      }
    } else {
      var newUploadDir = config.uploadDir + video.id + "/";
      fs.move(config.transcodingDir, newUploadDir.slice(0, -1), function(err){
        if (!err) {
          removeSync(config.transcodingDir);
          var files = fs.readdirSync(newUploadDir);
          var folderSize = 0;
          for (var i = 0; i < files.length; i++) {
            folderSize = folderSize + fs.statSync(newUploadDir + files[i]).size;
          }
          msg.shardsToUpload = files;
          msg.size = folderSize;
        } else {
          log(err, "fs move");
          msg.error = true;
        }
        callback(msg);
      });
    }
  });
}

function abortTranscoding(video) {
  if (transcoder && transcoderVideoId === video.id) {
    transcoder.kill();
    transcoder = null;
    transcoderVideoId = null;
    removeSync(config.transcodingDir);
  }
}

function checkProgress(video) {
  let liner;
  try {
    liner = new readlines(config.logfile);
  } catch (err) {
    return;
  }
  let line;
  let frames;
  let fps;
  while (line = liner.next()) {
    lineSplit = line.toString('ascii').split("=");
    if (lineSplit[0] === "frame" && !video.noFrames) {
      frames = lineSplit[1];
    } else if (lineSplit[0] === "fps" && !video.noFrames) {
      fps = lineSplit[1];
    }
  }
  var msg = {};
  if (frames) {
    msg.frames = parseInt(frames);
  }
  if (fps) {
    msg.fps = parseFloat(fps);
  }
  return msg;
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Upload Setup
// ---------------------------------------------------------------------------------------------------------------------

function uploadShard(shard_data, callback, retry) {
  msg = {};
  try {
    if ("x-amz-security-token" in shard_data.signedUrl.fields) {  // Production
      request
        .post(shard_data.signedUrl.url)
        .field("key", shard_data.signedUrl.fields.key)
        .field("AWSAccessKeyId", shard_data.signedUrl.fields.AWSAccessKeyId)
        .field("Policy", shard_data.signedUrl.fields.policy)
        .field("Signature", shard_data.signedUrl.fields.signature)
        .field("x-amz-security-token", shard_data.signedUrl.fields["x-amz-security-token"])
        .attach("file", config.uploadDir + shard_data.id + "/" + shard_data.file)
        .end(function (err, res) {
          if (err) {
            log(err, "request.post Production");
            log(res);
            removeSync(config.uploadDir + shard_data.id);
            msg.error = true;
          } else {
            msg.filename = shard_data.file;
          }
          callback(msg);
        });
    } else {  // Development
      request
        .post(shard_data.signedUrl.url)
        .field("key", shard_data.signedUrl.fields.key)
        .field("AWSAccessKeyId", shard_data.signedUrl.fields.AWSAccessKeyId)
        .field("Policy", shard_data.signedUrl.fields.policy)
        .field("Signature", shard_data.signedUrl.fields.signature)
        .attach("file", config.uploadDir + shard_data.id + "/" + shard_data.file)
        .end(function (err, res) {
          if (err) {
            log(err, "request.post Development");
            log(res);
            removeSync(config.uploadDir + shard_data.id);
            msg.error = true;
          } else {
            msg.filename = shard_data.file;
          }
          callback(msg);
        });
    }
  } catch (err) {
    if (retry && retry > 20) {
      log(err, "request.post Failure");
      removeSync(config.uploadDir + shard_data.id);
      msg.error = true;
      callback(msg);
    } else {
      if (!retry) {
        retry = 1;
      } else {
        retry = retry + 1
      }
      setTimeout(function(){
        uploadShard(shard_data, callback, retry);
      }, 1000 * pow(retry, 2));
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                  Helper Functions
// ---------------------------------------------------------------------------------------------------------------------

function log(msg, origin) {
  if (config.logging) {
    var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
    if (origin) {
      var originMsg = "Error Origin: " + origin;
      console.log(originMsg);
      log_file.write(util.format(originMsg) + '\n');
    }
    console.log(msg);
    log_file.write(util.format(msg) + '\n');
  }
  
}

function removeSync(file) {
  var i = 0;
  var error;
  while (i < 10) {
    try {
      fs.removeSync(file);
      break;
    } catch (err) {
      error = err;
    }
  }
  if (i === 10) {
    log("removeSync Failed 10 Times", "removeSync");
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
//                                                     Exports
// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
  getVideoFrames: getVideoFrames,
  startTranscoding: startTranscoding,
  abortTranscoding: abortTranscoding,
  checkProgress: checkProgress,
  uploadShard: uploadShard
};
