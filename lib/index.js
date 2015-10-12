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

var _miscHasMagic = require('./misc/has-magic');

var _miscHasMagic2 = _interopRequireDefault(_miscHasMagic);

var hasOwn = ({}).hasOwnProperty;
var updateStrategies = ['all', 'hash', 'changed'];
var defaultOptions = {
  caches: 'all',
  scope: '/',
  updateStrategy: 'all',
  externals: [],
  version: function version() {
    return new Date().toLocaleString();
  },
  rewrites: function rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, function (match, dir) {
      return dir || '/';
    });
  },

  ServiceWorker: {
    output: 'sw.js',
    entry: _path2['default'].join(__dirname, '../empty-entry.js')
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main', 'additional']
  }
};

var OfflinePlugin = (function () {
  function OfflinePlugin(options) {
    var _this = this;

    _classCallCheck(this, OfflinePlugin);

    this.options = (0, _deepExtend2['default'])({}, defaultOptions, options);
    this.hash = null;
    this.assets = null;
    this.scope = this.options.scope.replace(/\/$/, '/');
    this.externals = this.options.externals;
    this.strategy = this.options.updateStrategy;

    if (updateStrategies.indexOf(this.strategy) === -1) {
      throw new Error('Update strategy must be one of [' + updateStrategies + ']');
    }

    if (!Array.isArray(this.externals)) {
      this.externals = [];
    }

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

    this.REST_KEY = ':rest:';
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

          var data = {};

          _this2.useTools(function (tool, key) {
            data[key] = tool.getConfig(_this2);
          });

          result.loaders.push(_path2['default'].join(__dirname, 'misc/runtime-loader.js') + '?' + JSON.stringify(data));

          callback(null, result);
        });
      });

      compiler.plugin('make', function (compilation, callback) {
        _this2.useTools(function (tool) {
          return tool.addEntry(_this2, compilation, compiler);
        }).then(function () {
          callback();
        }, function () {
          throw new Error('Something went wrong');
        });
      });

      compiler.plugin('emit', function (compilation, callback) {
        _this2.hash = compilation.getStats().toJson().hash;
        _this2.setAssets(Object.keys(compilation.assets), compilation);

        _this2.useTools(function (tool) {
          return tool.apply(_this2, compilation, compiler);
        }).then(function () {
          callback();
        }, function () {
          throw new Error('Something went wrong');
        });
      });
    }
  }, {
    key: 'setAssets',
    value: function setAssets(assets, compilation) {
      var _this3 = this;

      var caches = this.options.caches || defaultOptions.caches;

      this.assets = assets;

      if (caches === 'all') {
        this.caches = {
          main: this.validatePaths(assets)
        };
      } else {
        this.caches = ['main', 'additional', 'optional'].reduce(function (result, key) {
          var cache = Array.isArray(caches[key]) ? caches[key] : [_this3.REST_KEY];
          var cacheResult = [];

          if (!cache.length) return result;

          cache.some(function (cacheKey) {
            if (cacheKey === _this3.REST_KEY) {
              if (assets.length) {
                cacheResult = cacheResult.concat(assets);
                assets = [];
              }

              return;
            }

            var magic = (0, _miscHasMagic2['default'])(cacheKey);

            if (magic) {
              var matched = undefined;

              for (var i = 0, len = assets.length; i < len; i++) {
                if (!magic.match(assets[i])) continue;

                matched = true;
                cacheResult.push(assets[i]);
                assets.splice(i, 1);
                i--, len--;
              }

              if (!matched) {
                compilation.warnings.push(new Error('OfflinePlugin: Cache pattern [' + cacheKey + '] did not matched any assets'));
              }

              return;
            }

            var index = assets.indexOf(cacheKey);

            externalsCheck: if (index === -1) {
              if (_this3.externals.length && _this3.externals.indexOf(cacheKey) !== -1) {
                break externalsCheck;
              }

              compilation.warnings.push(new Error('OfflinePlugin: Cache asset [' + cacheKey + '] is not found in output assets'));
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
        if (key === '/') {
          return _this4.scope;
        }

        return _this4.scope + key;
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
  }, {
    key: 'version',
    get: function get() {
      var version = this.options.version;

      return typeof version === 'function' ? version() : version + '';
    }
  }]);

  return OfflinePlugin;
})();

exports['default'] = OfflinePlugin;
module.exports = exports['default'];