var OfflinePlugin = require('../../');
var path = require('path');

var OnBuildPlugin = require('on-build-webpack');
var compare = require('./compare');

var testDir = process.cwd();

module.exports = function(OfflinePluginOptions) {
  return {
    entry: {
      main: 'main.js'
    },

    output: {
      path: path.join(testDir, '__output'),
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