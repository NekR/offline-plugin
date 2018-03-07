var OfflinePlugin = require(__ROOT__);
var path = require('path');

var OnBuildPlugin = require('on-build-webpack');
var DefinePlugin = require('webpack/lib/DefinePlugin');
var compare = require('./compare');

var webpackMajorVersion = require('webpack/package.json').version.split('.')[0];

module.exports = function(OfflinePluginOptions) {
  var testDir = process.cwd();
  var outputPath = path.join(testDir, '__output');

  OfflinePluginOptions.__tests = {
    swMetadataOnly: true,
    ignoreRuntime: true,
    noVersionDump: true,
    pluginVersion: '999.999.999'
  };

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