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

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _es6Promise = require('es6-promise');

var _miscUtils = require('./misc/utils');

var _loaderUtils = require('loader-utils');

var _loaderUtils2 = _interopRequireDefault(_loaderUtils);

var hasOwn = ({}).hasOwnProperty;
var updateStrategies = ['all', 'hash', 'changed'];
var defaultOptions = {
  scope: '', // deprecated

  caches: 'all',
  publicPath: '',
  updateStrategy: 'all',
  externals: [],
  excludes: ['**/.*', '**/*.map'],
  relativePaths: true,
  version: null,
  // for entry, default all
  'for': null,

  rewrites: function rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, function (match, dir) {
      if ((0, _miscUtils.isAbsoluteURL)(match)) {
        return match;
      }

      return dir || './';
    });
  },

  alwaysRevalidate: void 0,
  preferOnline: void 0,
  ignoreSearch: ['**'],

  ServiceWorker: {
    output: 'sw.js',
    entry: _path2['default'].join(__dirname, '../empty-entry.js'),
    scope: null,
    events: false
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main'],
    events: false
  }
};

var OfflinePlugin = (function () {
  function OfflinePlugin(options) {
    var _this = this;

    _classCallCheck(this, OfflinePlugin);

    this.options = (0, _deepExtend2['default'])({}, defaultOptions, options);
    this.hash = null;
    this.assets = null;
    this.hashesMap = null;
    this.externals = null;
    this.publicPath = this.options.publicPath;
    this.strategy = this.options.updateStrategy;
    this.relativePaths = this.options.relativePaths;
    this.warnings = [];

    if (this.options.scope) {
      this.warnings.push(new Error('OfflinePlugin: `scope` option is deprecated, use `publicPath` instead'));

      if (this.publicPath) {
        this.warnings.push(new Error('OfflinePlugin: `publicPath` is used with deprecated `scope` option, `scope` is ignored'));
      } else {
        this.publicPath = this.options.scope;
      }
    }

    if (typeof this.publicPath !== 'string') {
      this.publicPath = null;
    }

    if (updateStrategies.indexOf(this.strategy) === -1) {
      throw new Error('Update strategy must be one of [' + updateStrategies + ']');
    } else if (this.strategy === 'hash') {
      this.warnings.push(new Error('OfflinePlugin: `hash` update strategy is deprecated, use `all` strategy and { version: "[hash]" } instead'));

      this.strategy = 'all';
      this.options.version = '[hash]';
    }

    if (!Array.isArray(this.options.externals)) {
      this.options.externals = [];
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
    this.EXTERNALS_KEY = ':externals:';
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
      var compilerOptions = compiler.options;

      if (typeof this.publicPath !== 'string' && compilerOptions && compilerOptions.output && compilerOptions.output.publicPath) {
        this.publicPath = compilerOptions.output.publicPath;
      }

      if (this.publicPath) {
        this.publicPath = this.publicPath.replace(/\/$/, '') + '/';
      }

      if (this.relativePaths && this.publicPath) {
        this.warnings.push(new Error('OfflinePlugin: `publicPath` is used in conjunction with `relativePaths`,\n' + '`relativePaths` will be ignored'));

        this.relativePaths = false;
      }

      compiler.plugin('normal-module-factory', function (nmf) {
        nmf.plugin('after-resolve', function (result, callback) {
          var resource = _path2['default'].resolve(compiler.context, result.resource);

          if (resource !== runtimePath) {
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
        if (_this2.warnings.length) {
          [].push.apply(compilation.warnings, _this2.warnings);
        }

        _this2.useTools(function (tool) {
          return tool.addEntry(_this2, compilation, compiler);
        }).then(function () {
          callback();
        }, function () {
          throw new Error('Something went wrong');
        });
      });

      compiler.plugin('emit', function (compilation, callback) {
        var stats = compilation.getStats().toJson();

        // By some reason errors raised here are not fatal,
        // so we need manually try..catch and exit with error
        try {
          _this2.hash = compilation.hash;
          _this2.setAssets(compilation);
          _this2.setHashesMap(compilation);

          // Not used yet
          // this.setNetworkOptions();
        } catch (e) {
          callback(e);
          return;
        }

        _this2.useTools(function (tool) {
          return tool.apply(_this2, compilation, compiler);
        }).then(function () {
          callback();
        }, function () {
          callback(new Error('Something went wrong'));
        });
      });
    }
  }, {
    key: 'setAssets',
    value: function setAssets(compilation) {
      var _this3 = this;

      var caches = this.options.caches || defaultOptions.caches;

      if (this.options.safeToUseOptionalCaches !== true && (caches.additional && caches.additional.length || caches.optional && caches.optional.length)) {
        compilation.warnings.push(new Error('OfflinePlugin: Cache sections `additional` and `optional` could be used ' + 'only when each asset passed to it has unique name (e.g. hash or version in it) and ' + 'is permanently available for given URL. If you think that it\' your case, ' + 'set `safeToUseOptionalCaches` option to `true`, to remove this warning.'));
      }

      var excludes = this.options.excludes;
      var assets = Object.keys(compilation.assets);
      var externals = this.options.externals;

      if (Array.isArray(excludes) && excludes.length) {
        assets = assets.filter(function (asset) {
          if (excludes.some(function (glob) {
            if ((0, _minimatch2['default'])(asset, glob)) {
              return true;
            }
          })) {
            return false;
          }

          return true;
        });
      }

      this.externals = this.validatePaths(externals);

      if (caches === 'all') {
        this.assets = this.validatePaths(assets).concat(this.externals);
        this.caches = {
          main: this.assets.concat()
        };
      } else {
        (function () {
          var restSection = undefined;
          var externalsSection = undefined;

          var handledCaches = ['main', 'additional', 'optional'].reduce(function (result, key) {
            var cache = Array.isArray(caches[key]) ? caches[key] : [];

            if (!cache.length) {
              result[key] = cache;
              return result;
            }

            var cacheResult = [];

            cache.some(function (cacheKey) {
              if (cacheKey === _this3.REST_KEY) {
                if (restSection) {
                  throw new Error('The ' + _this3.REST_KEY + ' keyword can be used only once');
                }

                restSection = key;
                return;
              }

              if (cacheKey === _this3.EXTERNALS_KEY) {
                if (externalsSection) {
                  throw new Error('The ' + _this3.EXTERNALS_KEY + ' keyword can be used only once');
                }

                externalsSection = key;
                return;
              }

              var magic = undefined;

              if (!(0, _miscUtils.isAbsoluteURL)(cacheKey) && cacheKey[0] !== '/' && cacheKey.indexOf('./') !== 0 && (magic = (0, _miscUtils.hasMagic)(cacheKey))) {
                var matched = undefined;

                for (var i = 0, len = assets.length; i < len; i++) {
                  if (!magic.match(assets[i])) continue;

                  matched = true;
                  cacheResult.push(assets[i]);
                  assets.splice(i, 1);
                  i--, len--;
                }

                if (!matched) {
                  compilation.warnings.push(new Error('OfflinePlugin: Cache pattern [' + cacheKey + '] did not match any assets'));
                }

                return;
              }

              var index = assets.indexOf(cacheKey);

              __EXTERNALS_CHECK: if (index === -1) {
                var externalsIndex = externals.indexOf(cacheKey);

                if (externalsIndex !== -1) {
                  externals.splice(index, 1);
                  break __EXTERNALS_CHECK;
                }

                compilation.warnings.push(new Error('OfflinePlugin: Cache asset [' + cacheKey + '] is not found in the output assets,' + 'if it\'s an external asset, put it to the |externals| option to remove this warning'));
              } else {
                assets.splice(index, 1);
              }

              cacheResult.push(cacheKey);
            });

            result[key] = _this3.validatePaths(cacheResult);

            return result;
          }, {});

          if (restSection && assets.length) {
            handledCaches[restSection] = handledCaches[restSection].concat(_this3.validatePaths(assets));
          }

          if (externalsSection && externals.length) {
            handledCaches[externalsSection] = handledCaches[externalsSection].concat(_this3.validatePaths(externals));
          }

          _this3.caches = handledCaches;
          _this3.assets = [].concat(_this3.caches.main, _this3.caches.additional, _this3.caches.optional);
        })();
      }
    }
  }, {
    key: 'setHashesMap',
    value: function setHashesMap(compilation) {
      var _this4 = this;

      var hashesMap = this.findAssetsHashes(compilation);
      var hashedAssets = Object.keys(hashesMap).reduce(function (result, hash) {
        result[hashesMap[hash]] = hash;
        return result;
      }, {});

      this.hashesMap = {};

      Object.keys(compilation.assets).forEach(function (key) {
        var validatedPath = _this4.validatePaths([key])[0];

        if (typeof validatedPath !== 'string' || _this4.assets.indexOf(validatedPath) === -1) return;

        var hash = undefined;

        if (hashedAssets[key]) {
          hash = hashedAssets[key];
        } else {
          hash = _loaderUtils2['default'].getHashDigest(compilation.assets[key].source());
        }

        _this4.hashesMap[hash] = validatedPath;
      });
    }
  }, {
    key: 'findAssetsHashes',
    value: function findAssetsHashes(compilation) {
      var map = {};

      compilation.chunks.forEach(function (chunk) {
        if (chunk.hash && chunk.files.length) {
          map[chunk.hash] = chunk.files[0];
        }
      });

      return map;
    }
  }, {
    key: 'setNetworkOptions',
    value: function setNetworkOptions() {
      var alwaysRevalidate = this.options.alwaysRevalidate;
      var preferOnline = this.options.preferOnline;
      var ignoreSearch = this.options.ignoreSearch;

      var assets = this.assets;

      // Disable temporarily
      if (Array.isArray(alwaysRevalidate) && alwaysRevalidate.length) {
        alwaysRevalidate = assets.filter(function (asset) {
          if (alwaysRevalidate.some(function (glob) {
            if ((0, _minimatch2['default'])(asset, glob)) {
              return true;
            }
          })) {
            return true;
          }

          return false;
        });

        if (alwaysRevalidate.length) {
          this.alwaysRevalidate = alwaysRevalidate;
        }
      }

      if (Array.isArray(ignoreSearch) && ignoreSearch.length) {
        ignoreSearch = assets.filter(function (asset) {
          if (ignoreSearch.some(function (glob) {
            if ((0, _minimatch2['default'])(asset, glob)) {
              return true;
            }
          })) {
            return true;
          }

          return false;
        });

        if (ignoreSearch.length) {
          this.ignoreSearch = ignoreSearch;
        }
      }

      if (Array.isArray(preferOnline) && preferOnline.length) {
        preferOnline = assets.filter(function (asset) {
          if (preferOnline.some(function (glob) {
            if ((0, _minimatch2['default'])(asset, glob)) {
              return true;
            }
          })) {
            return true;
          }

          return false;
        });

        if (preferOnline.length) {
          this.preferOnline = preferOnline;
        }
      }
    }
  }, {
    key: 'validatePaths',
    value: function validatePaths(assets) {
      var _this5 = this;

      return assets.map(this.rewrite).filter(function (asset) {
        return !!asset;
      }).map(function (key) {
        // If absolute url, use it as is
        if ((0, _miscUtils.isAbsoluteURL)(key)) {
          return key;
        }

        if (_this5.relativePaths) {
          return key.replace(/^\.\//, '');
        }

        return _this5.publicPath + key.replace(/^\.?\//, '');
      });
    }
  }, {
    key: 'useTools',
    value: function useTools(fn) {
      var _this6 = this;

      var tools = Object.keys(this.tools).map(function (tool) {
        return fn(_this6.tools[tool], tool);
      });

      return _es6Promise.Promise.all(tools);
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
      var hash = this.hash;

      if (version == null) {
        return new Date().toLocaleString();
      }

      if (typeof version === 'function') {
        return version(this);
      }

      return (0, _miscUtils.interpolateString)(version, { hash: hash });
    }
  }]);

  return OfflinePlugin;
})();

exports['default'] = OfflinePlugin;

OfflinePlugin.defaultOptions = defaultOptions;
module.exports = exports['default'];