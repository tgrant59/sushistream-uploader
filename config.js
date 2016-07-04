module.exports = {
  indexPath: "file://" + __dirname + "/dist/index.html",
  tmpDir: __dirname + "/tmp",
  openDevTools: true,
  externalSiteUrl: "https://sushistream.co",
  externalAppUrl: "http://localhost:7000/#",
  autoUpdater: {
    start: false,
    url: "https://uploader.sushistream.co"
  },
  crashReporter: {
    start: false,
    productName: "SushiStream Uploader",
    companyName: "SushiStream",
    submitURL: "https://uploader.sushistream.co/breakpad",
    autoSubmit: true
  }
};