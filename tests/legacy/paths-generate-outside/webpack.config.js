var path = require('path');
var config = require('../config')({
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
  version: '[hash]'
});

config.output.path = path.join(config.output.path, 'inner');
config.output.publicPath = '/dist/';


module.exports = config;