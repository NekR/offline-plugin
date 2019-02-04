const webpack = require('webpack');
let UglifyJsPlugin;

try {
  UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
} catch (e) {}

if (!UglifyJsPlugin) {
  try {
    UglifyJsPlugin = require('uglifyjs-webpack-plugin');
  } catch (e) {}
}

module.exports = UglifyJsPlugin;