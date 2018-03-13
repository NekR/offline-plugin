var OfflinePlugin = require(__ROOT__);
var path = require('path');

var deepExtend = require('deep-extend');
var OnBuildPlugin = require('on-build-webpack');
var DefinePlugin = require('webpack/lib/DefinePlugin');
var compare = require('./compare');

var webpackMajorVersion = require('webpack/package.json').version.split('.')[0];

module.exports = function(OfflinePluginOptions, testFlags) {
  var testDir = process.cwd();
  var outputPath = path.join(testDir, '__output');

  OfflinePluginOptions.__tests = deepExtend({
    swMetadataOnly: true,
    ignoreRuntime: true,
    noVersionDump: true,
    appCacheEnabled: true,
    pluginVersion: '999.999.999'
  }, testFlags || {});

  var config = {
    bail: true,
    entry: {
      main: 'main.js'
    },

    output: {
      path: outputPath,
      filename: '[name].js',
    },

    plugins: [
      new OfflinePlugin(OfflinePluginOptions),
      new OnBuildPlugin(function(stats) {
        compare(testDir);
      }),
      new DefinePlugin({
        RUNTIME_PATH: JSON.stringify(path.join(__ROOT__, 'runtime'))
      }),
    ],

    resolve: {
      modules: [
        path.join(testDir),
        'node_modules'
      ],
      extensions: ['.js']
    }
  };

  if (webpackMajorVersion === '4') {
    config.mode = 'none';
  }

  return config;
};