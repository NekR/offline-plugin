'use strict';

var webpack = require('webpack');
var UglifyJsPlugin = undefined;
var isUsingTerser = false;

try {
  UglifyJsPlugin = require('terser-webpack-plugin');
  isUsingTerser = true;
} catch (e) {}

try {
  UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
} catch (e) {}

if (!UglifyJsPlugin) {
  try {
    UglifyJsPlugin = require('uglifyjs-webpack-plugin');
  } catch (e) {}
}

module.exports = UglifyJsPlugin ? {
  makeUglifyJsPlugin: function makeUglifyJsPlugin(args) {
    var normalizedArgs = args;
    // port uglifyOptions to terserOptions when using terser webpack plugin
    if (isUsingTerser && args && args.uglifyOptions) {
      normalizedArgs = Object.assign({}, args, {
        terserOptions: args.uglifyOptions
      });
      delete normalizedArgs.uglifyOptions;
    }

    return new UglifyJsPlugin(normalizedArgs);
  },
  isInstanceOfUglifyJsPlugin: function isInstanceOfUglifyJsPlugin(plugin) {
    return plugin instanceof UglifyJsPlugin;
  }
} : {
  makeUglifyJsPlugin: null,
  isInstanceOfUglifyJsPlugin: function isInstanceOfUglifyJsPlugin(plugin) {
    return false;
  }
};