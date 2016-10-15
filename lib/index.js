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

var _path2 = require('path');

var _path3 = _interopRequireDefault(_path2);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _miscUtils = require('./misc/utils');

var _loaderUtils = require('loader-utils');

var _loaderUtils2 = _interopRequireDefault(_loaderUtils);

var _slash = require('slash');

var _slash2 = _interopRequireDefault(_slash);

var hasOwn = ({}).hasOwnProperty;
var updateStrategies = ['all', 'hash', 'changed'];
var defaultOptions = {
  caches: 'all',
  publicPath: void 0,
  updateStrategy: 'all',
  responseStrategy: 'cache-first',
  externals: [],
  excludes: ['**/.*', '**/*.map'],
  // Hack to have intermediate value, e.g. default one, true and false
  relativePaths: ':relativePaths:',
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
    entry: _path3['default'].join(__dirname, '../empty-entry.js'),
    scope: null,
    events: false
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main'],
    events: false
  },

  // Needed for testing
  __tests: {
    swMetadataOnly: false
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
    this.responseStrategy = this.options.responseStrategy;
    this.relativePaths = this.options.relativePaths;
    this.__tests = this.options.__tests;
    this.warnings = [];
    this.errors = [];

    if (this.options.responseStrategy !== "cache-first" && this.options.responseStrategy !== "network-first") {
      throw new Error('OfflinePlugin: `responseStrategy` option must use ' + '`cache-first` or `network-first` (or be undefined).');
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

      var runtimePath = _path3['default'].resolve(__dirname, '../runtime.js');
      var compilerOptions = compiler.options;

      if (this.relativePaths === true) {
        this.publicPath = null;
      }

      if (typeof this.publicPath !== 'string' && compilerOptions && compilerOptions.output && compilerOptions.output.publicPath && this.relativePaths !== true) {
        this.publicPath = compilerOptions.output.publicPath;
        this.relativePaths = false;
      }

      if (this.publicPath) {
        this.publicPath = this.publicPath.replace(/\/$/, '') + '/';
      }

      if (this.relativePaths === true && this.publicPath) {
        this.errors.push(new Error('OfflinePlugin: `publicPath` is used in conjunction with `relativePaths`,\n' + 'choose one of it'));

        this.relativePaths = false;
      }

      if (this.relativePaths === defaultOptions.relativePaths) {
        this.relativePaths = true;
      }

      this.useTools(function (tool, key) {
        _this2.resolveToolPaths(tool, key, compiler);
      });

      compiler.plugin('normal-module-factory', function (nmf) {
        nmf.plugin('after-resolve', function (result, callback) {
          var resource = _path3['default'].resolve(compiler.context, result.resource);

          if (resource !== runtimePath) {
            return callback(null, result);
          }

          var data = {};

          _this2.useTools(function (tool, key) {
            data[key] = tool.getConfig(_this2);
          });

          result.loaders.push(_path3['default'].join(__dirname, 'misc/runtime-loader.js') + '?' + JSON.stringify(data));

          callback(null, result);
        });
      });

      compiler.plugin('make', function (compilation, callback) {
        if (_this2.warnings.length) {
          [].push.apply(compilation.warnings, _this2.warnings);
        }

        if (_this2.errors.length) {
          [].push.apply(compilation.errors, _this2.errors);
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
                  externals.splice(externalsIndex, 1);
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
    key: 'resolveToolPaths',
    value: function resolveToolPaths(tool, key, compiler) {
      // Tool much implement:
      //
      // tool.output
      // tool.publicLocation
      // tool.basePath
      // tool.location
      // tool.pathRewrite

      if (!this.relativePaths && !this.publicPath) {
        throw new Error('OfflinePlugin: Cannot generate base path for ' + key);
      }

      var isDirectory = tool.output[tool.output.length - 1] === '/';

      if (this.relativePaths) {
        var compilerOutput = (compiler.options.output || { path: process.cwd() }).path;
        var absoluteOutput = _path3['default'].resolve(compilerOutput, tool.output);

        var relativeBase = undefined;

        if (isDirectory) {
          relativeBase = _path3['default'].relative(absoluteOutput, compilerOutput);
        } else {
          relativeBase = _path3['default'].relative(_path3['default'].dirname(absoluteOutput), compilerOutput);
        }

        relativeBase = (0, _slash2['default'])(relativeBase);
        relativeBase = relativeBase.replace(/\/$/, '');

        if (relativeBase) {
          relativeBase = relativeBase + '/';
        }

        tool.basePath = relativeBase[0] === '.' ? relativeBase : './' + relativeBase;
      } else if (this.publicPath) {
        tool.basePath = this.publicPath.replace(/\/$/, '') + '/';
      }

      if (this.relativePaths) {
        tool.location = tool.output;
      } else if (this.publicPath && tool.publicLocation) {
        tool.location = tool.publicLocation;
      } else if (this.publicPath) {
        var publicUrl = _url2['default'].parse(this.publicPath);
        var publicPath = publicUrl.pathname;

        publicUrl.pathname = _path3['default'].join(publicPath, tool.output);
        var outerPathname = _path3['default'].join('/outer/', publicPath, tool.output);

        if (outerPathname.indexOf('/outer/') !== 0) {
          new Error('OfflinePlugin: Wrong ' + key + '.output value. Final ' + key + '.location URL path bounds are outside of publicPath');
        }

        tool.location = _url2['default'].format(publicUrl);
      }

      if (this.relativePaths) {
        tool.pathRewrite = function (_path) {
          if ((0, _miscUtils.isAbsoluteURL)(_path) || _path[0] === '/') {
            return _path;
          }

          return tool.basePath + _path;
        };
      } else {
        tool.pathRewrite = function (path) {
          return path;
        };
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

        // Absolute path, use it as is
        if (key[0] === '/') {
          return key;
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