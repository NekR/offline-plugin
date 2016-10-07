var OfflinePlugin = require('../../');
var path = require('path');

var OnBuildPlugin = require('on-build-webpack');
var compare = require('./compare');

var testDir = process.cwd();
var outputPath = path.join(testDir, '__output');

module.exports = function(OfflinePluginOptions) {
  OfflinePluginOptions.__tests = {
    swMetadataOnly: true
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
    ],

    resolve: {
      root: path.join(testDir),
      extensions: ['', '.js']
    }
  }
};