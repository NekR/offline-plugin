'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _appCache = require('./app-cache');

var _appCache2 = _interopRequireDefault(_appCache);

var _serviceWorker = require('./service-worker');

var _serviceWorker2 = _interopRequireDefault(_serviceWorker);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var REST_KEY = ':rest:';

var hasOwn = ({}).hasOwnProperty;
var defaultOptions = Object.defineProperties({
  caches: 'all',
  scope: '/',

  rewrites: function rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, function (match, dir) {
      return dir || '/';
    });
  },

  ServiceWorker: {
    output: 'sw.js',
    entry: null
  },

  AppCache: {
    NETWORK: '*',
    directory: 'appcache/'
  }
}, {
  version: {
    get: function get() {
      return Date.now();
    },
    configurable: true,
    enumerable: true
  }
});

var OfflinePlugin = (function () {
  function OfflinePlugin(options) {
    var _this = this;

    _classCallCheck(this, OfflinePlugin);

    this.options = (0, _deepExtend2['default'])({}, defaultOptions, options);
    this.assets = null;
    this.version = this.options.version;

    var rewrites = this.options.rewrites || defaultOptions.rewrites;

    if (typeof rewrites === 'function') {
      this.rewrite = function (asset) {
        if (asset.indexOf(_this.entryPrefix) === 0) {
          return '';
        }

        return rewrites(asset);
      };
    } else {
      this.rewrite = function (asset) {
        if (asset.indexOf(_this.entryPrefix) === 0) {
          return '';
        }

        if (!hasOwn.call(rewrites, asset)) {
          return asset;
        }

        return rewrites[asset];
      };
    }

    this.entryPrefix = '__offline_';
    this.tools = {};

    this.addTool(_serviceWorker2['default'], 'ServiceWorker');
    this.addTool(_appCache2['default'], 'AppCache');

    if (!Object.keys(this.tools).length) {
      throw new Error('You should have at least one cache service to be specified');
    }
  }

  _createClass(OfflinePlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this2 = this;

      var runtimePath = _path2['default'].resolve(__dirname, '../runtime.js');

      compiler.plugin('normal-module-factory', function (nmf) {
        nmf.plugin('after-resolve', function (result, callback) {
          if (result.resource !== runtimePath) {
            return callback(null, result);
          }

          var caches = _this2.options.caches;
          var data = {
            hasAdditionalCache: !!(caches !== 'all' && caches.additional && caches.additional.length)
          };

          _this2.useTools(function (tool, key) {
            data[key] = tool.getConfig(_this2);
          });

          result.loaders.push(_path2['default'].join(__dirname, '../misc/runtime-loader.js') + '?' + JSON.stringify(data));

          callback(null, result);

          // data.loaders.unshift(path.join(__dirname, "postloader.js"));
        });
      });

      compiler.plugin('make', function (compilation, callback) {
        _this2.useTools(function (tool) {
          return tool.addEntry(_this2, compilation, compiler);
        }).then(function () {
          callback();
        })['catch'](function () {
          throw new Error('Something went wrong');
        });
      });

      compiler.plugin('emit', function (compilation, callback) {
        _this2.setAssets(Object.keys(compilation.assets));

        _this2.useTools(function (tool) {
          return tool.apply(_this2, compilation, compiler);
        }).then(function () {
          callback();
        })['catch'](function () {
          throw new Error('Something went wrong');
        });
      });
    }
  }, {
    key: 'setAssets',
    value: function setAssets(assets) {
      var _this3 = this;

      var caches = this.options.caches || defaultOptions.caches;

      this.assets = assets;

      if (caches === 'all') {
        this.caches = {
          main: this.validatePaths(assets)
        };
      } else {
        this.caches = ['main', 'additional', 'optional'].reduce(function (result, key) {
          var cache = Array.isArray(caches[key]) ? caches[key] : [REST_KEY];
          var cacheResult = [];

          if (!cache.length) return result;

          cache.some(function (cacheKey) {
            if (cacheKey === REST_KEY) {
              if (assets.length) {
                cacheResult = cacheResult.concat(assets);
                assets = [];
              }

              return;
            }

            var index = assets.indexOf(cacheKey);

            if (index === -1) {
              console.warn('Cache asset [' + cacheKey + '] is not found in output assets');
            } else {
              assets.splice(index, 1);
            }

            cacheResult.push(cacheKey);
          });

          result[key] = _this3.validatePaths(cacheResult);

          return result;
        }, {});
      }
    }
  }, {
    key: 'validatePaths',
    value: function validatePaths(assets) {
      var _this4 = this;

      return assets.map(this.rewrite).filter(function (asset) {
        return !!asset;
      }).map(function (key) {
        if (key === '/') return key;

        return _this4.options.scope + key;
      });
    }
  }, {
    key: 'stripEmptyAssets',
    value: function stripEmptyAssets(asset) {
      return !!asset;
    }
  }, {
    key: 'useTools',
    value: function useTools(fn) {
      var _this5 = this;

      var tools = Object.keys(this.tools).map(function (tool) {
        return fn(_this5.tools[tool], tool);
      });

      return Promise.all(tools);
    }
  }, {
    key: 'addTool',
    value: function addTool(Tool, name) {
      var options = this.options[name];

      if (options === null || options === false) {
        // tool is not needed
        return;
      }

      this.tools[name] = new Tool(options);
    }
  }]);

  return OfflinePlugin;
})();

exports['default'] = OfflinePlugin;
module.exports = exports['default'];