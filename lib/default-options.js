'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _miscUtils = require('./misc/utils');

exports['default'] = {
  caches: 'all',
  publicPath: void 0,
  updateStrategy: 'changed',
  responseStrategy: 'cache-first',
  externals: [],
  excludes: ['**/.*', '**/*.map'],
  // Hack to have intermediate value, e.g. default one, true and false
  relativePaths: ':relativePaths:',
  version: null,
  autoUpdate: false,

  rewrites: function rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, function (match, dir) {
      if ((0, _miscUtils.isAbsoluteURL)(match)) {
        return match;
      }

      return dir || './';
    });
  },

  cacheMaps: null,

  ServiceWorker: {
    output: 'sw.js',
    entry: _path2['default'].join(__dirname, '../tpls/empty-entry.js'),
    scope: null,
    events: false,
    prefetchRequest: {
      credentials: 'omit',
      headers: void 0,
      mode: 'cors',
      cache: void 0
    },
    minify: null,

    navigateFallbackURL: void 0,
    navigateFallbackForRedirects: false
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main'],
    events: false,
    disableInstall: false,
    includeCrossOrigin: false
  },

  // Needed for testing
  __tests: {
    swMetadataOnly: false,
    ignoreRuntime: false,
    noVersionDump: false
  },

  // Not yet used
  alwaysRevalidate: void 0,
  preferOnline: void 0,
  ignoreSearch: ['**']
};
module.exports = exports['default'];