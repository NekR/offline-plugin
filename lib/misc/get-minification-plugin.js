'use strict';

var webpack = require('webpack');
var MinificationPlugin = undefined;
var isUsingTerser = false;

if (!MinificationPlugin) {
  try {
    MinificationPlugin = require('terser-webpack-plugin');
    isUsingTerser = true;
  } catch (e) {}
}

if (!MinificationPlugin) {
  try {
    MinificationPlugin = webpack.optimize.UglifyJsPlugin;
  } catch (e) {}
}

if (!MinificationPlugin) {
  try {
    MinificationPlugin = require('uglifyjs-webpack-plugin');
  } catch (e) {}
}

module.exports = MinificationPlugin ? {
  makeMinificationPlugin: function makeMinificationPlugin(args) {
    var normalizedArgs = args;
    // port uglifyOptions to terserOptions when using terser webpack plugin
    if (isUsingTerser && args && args.uglifyOptions) {
      normalizedArgs = Object.assign({}, args);
      normalizedArgs.terserOptions = args.uglifyOptions;
      delete normalizedArgs.uglifyOptions;
    }

    return new MinificationPlugin(normalizedArgs);
  },
  isMinificationPlugin: function isMinificationPlugin(plugin) {
    return plugin instanceof MinificationPlugin;
  }
} : {
  makeMinificationPlugin: null,
  isMinificationPlugin: function isMinificationPlugin(plugin) {
    return false;
  }
};