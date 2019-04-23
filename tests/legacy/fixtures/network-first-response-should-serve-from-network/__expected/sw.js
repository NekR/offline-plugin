var __wpo = {
  "assets": {
    "main": [
      "./external.js"
    ],
    "additional": [],
    "optional": []
  },
  "externals": [
    "./external.js"
  ],
  "shouldServeFromNetwork": function (response, urlString, cacheUrl) {
      if(urlString.match(/\//)) {
        return true;
      }
      return response.ok;
    },
  "hashesMap": {},
  "strategy": "changed",
  "responseStrategy": "cache-first",
  "version": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
  "name": "webpack-offline",
  "relativePaths": true
};