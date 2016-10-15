var path = require('path');
var config = __CONFIG__({
  externals: [
    '/images/bgz.jpg',
    '/images/hamburger.svg',
    '/images/logo_grey.svg',
  ],
  ServiceWorker: {
    output: '../sw.js'
  },
  AppCache: {
    output: '../appcache'
  },
  version: '[hash]',
  relativePaths: true
});

config.output.path = path.join(config.output.path, 'dist');

module.exports = config;