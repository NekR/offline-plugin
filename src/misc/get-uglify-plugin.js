const webpack = require('webpack');
let UglifyJsPlugin;

try {
  UglifyJsPlugin =
    require('uglifyjs-webpack-plugin') ||
    webpack.optimize.UglifyJsPlugin;
} catch (e) {}

module.exports = UglifyJsPlugin;