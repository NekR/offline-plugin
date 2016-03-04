'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _webpackLibSingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

var _webpackLibSingleEntryPlugin2 = _interopRequireDefault(_webpackLibSingleEntryPlugin);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var _es6Promise = require('es6-promise');

var _miscGetSource = require('./misc/get-source');

var _miscGetSource2 = _interopRequireDefault(_miscGetSource);

var _miscPathToBase = require('./misc/path-to-base');

var _miscPathToBase2 = _interopRequireDefault(_miscPathToBase);

var ServiceWorker = (function () {
  function ServiceWorker(options) {
    _classCallCheck(this, ServiceWorker);

    this.entry = options.entry;
    this.output = options.output.replace(/^\//, '');
    this.basePath = (0, _miscPathToBase2['default'])(this.output, true);

    this.ENTRY_NAME = 'serviceworker';
    this.CACHE_NAME = 'webpack-offline';
    this.SW_DATA_VAR = '__wpo';
  }

  _createClass(ServiceWorker, [{
    key: 'addEntry',
    value: function addEntry(plugin, compilation, compiler) {
      if (!this.entry) return _es6Promise.Promise.resolve();

      var name = plugin.entryPrefix + this.ENTRY_NAME;
      var childCompiler = compilation.createChildCompiler(name, {
        // filename: this.output
        filename: name
      });

      var data = JSON.stringify({
        data_var_name: this.SW_DATA_VAR
      });
      var loader = '!!' + _path2['default'].join(__dirname, 'misc/sw-loader.js') + '?' + data;
      var entry = loader + '!' + this.entry;

      childCompiler.context = compiler.context;
      childCompiler.apply(new _webpackLibSingleEntryPlugin2['default'](compiler.context, entry, name));

      (compiler.options.plugins || []).some(function (plugin) {
        if (plugin instanceof _webpack2['default'].optimize.UglifyJsPlugin) {
          var options = (0, _deepExtend2['default'])({}, plugin.options);

          options.test = new RegExp(name);
          childCompiler.apply(new _webpack2['default'].optimize.UglifyJsPlugin(options));

          return true;
        }
      });

      // Needed for HMR. offline-plugin doesn't support it,
      // but added just in case to prevent other errors
      childCompiler.plugin('compilation', function (compilation) {
        if (compilation.cache) {
          if (!compilation.cache[name]) {
            compilation.cache[name] = {};
          }

          compilation.cache = compilation.cache[name];
        }
      });

      return new _es6Promise.Promise(function (resolve, reject) {
        childCompiler.runAsChild(function (err, entries, childCompilation) {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
      });
    }
  }, {
    key: 'apply',
    value: function apply(plugin, compilation, compiler) {
      var minify = (compiler.options.plugins || []).some(function (plugin) {
        return plugin instanceof _webpack2['default'].optimize.UglifyJsPlugin;
      });

      var source = this.getDataTemplate(plugin.caches, plugin, minify);

      if (this.entry) {
        var _name = plugin.entryPrefix + this.ENTRY_NAME;
        var asset = compilation.assets[_name];

        if (!asset) {
          compilation.errors.push(new Error('OfflinePlugin: ServiceWorker entry is not found in output assets'));

          return;
        }

        delete compilation.assets[_name];
        source += '\n\n' + asset.source();
      }

      compilation.assets[this.output] = (0, _miscGetSource2['default'])(source);
    }
  }, {
    key: 'getDataTemplate',
    value: function getDataTemplate(data, plugin, minify) {
      var _this = this;

      var cache = function cache(key) {
        return (data[key] || []).map(plugin.relativePaths ? function (path) {
          return _this.basePath + path;
        } : function (a) {
          return a;
        });
      };

      return ('\n      var ' + this.SW_DATA_VAR + ' = ' + JSON.stringify({
        assets: {
          main: cache('main'),
          additional: cache('additional'),
          optional: cache('optional')
        },
        strategy: plugin.strategy,
        version: plugin.strategy === 'all' ? plugin.version : void 0,
        hash: plugin.strategy !== 'all' ? plugin.hash : void 0,
        name: this.CACHE_NAME,
        relativePaths: plugin.relativePaths
      }, null, minify ? void 0 : '  ') + ';\n    ').trim();
    }
  }, {
    key: 'getConfig',
    value: function getConfig(plugin) {
      return {
        output: plugin.publicPath + this.output
      };
    }
  }]);

  return ServiceWorker;
})();

exports['default'] = ServiceWorker;
module.exports = exports['default'];