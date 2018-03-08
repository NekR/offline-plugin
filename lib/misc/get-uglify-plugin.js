'use strict';

var webpack = require('webpack');
var UglifyJsPlugin = undefined;

try {
  UglifyJsPlugin = require('uglifyjs-webpack-plugin') || webpack.optimize.UglifyJsPlugin;
} catch (e) {}

module.exports = UglifyJsPlugin;