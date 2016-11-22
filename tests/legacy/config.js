var OfflinePlugin = require(__ROOT__);
var path = require('path');
var webpack = require('webpack');

var OnBuildPlugin = require('on-build-webpack');
var compare = require('./compare');

module.exports = function(OfflinePluginOptions) {
  var testDir = process.cwd();
  var outputPath = path.join(testDir, '__output');

  OfflinePluginOptions.__tests = {
    swMetadataOnly: true,
    ignoreRuntime: true,
    noVersionDump: true,
    pluginVersion: '999.999.999'
  };

  return {
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
      new webpack.DefinePlugin({
        RUNTIME_PATH: JSON.stringify(path.join(__ROOT__, 'runtime'))
      }),
    ],

    resolve: {
      root: path.join(testDir),
      extensions: ['', '.js']
    }
  }
};