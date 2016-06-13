var app = angular.module("constantsModule", []);

app.constant("constants", {
  roles: {
    unverified: "unverified",
    unpaid: "unpaid",
    paid: "paid",
    cancelled: "cancelled"
  },
  timing: {
    folderStructureRefreshInterval: 60000
  },
  mongoPlaceholders: {
    dot: "%@%",
    dollar: "#@#"
  },
  regex: {
    videoFormats: /[^\s]+\.(webm|mkv|flv|ogg|ogv|avi|mov|qt|wmv|rm|rmvb|asf|mp4|m4v|mpg|mpeg|mp2|mpe|mpv|m2v|3gp|3g2)$/
  }
});
