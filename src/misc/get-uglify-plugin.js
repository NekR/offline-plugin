const webpack = require('webpack');
let UglifyJsPlugin;
let isUsingTerser = false;

if (!UglifyJsPlugin) {
  try {
    UglifyJsPlugin = require('terser-webpack-plugin');
    isUsingTerser = true;
  } catch (e) {}
}

if (!UglifyJsPlugin) {
  try {
    UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
  } catch (e) {}
}

if (!UglifyJsPlugin) {
  try {
    UglifyJsPlugin = require('uglifyjs-webpack-plugin');
  } catch (e) {}
}

module.exports = UglifyJsPlugin ? {
  makeUglifyJsPlugin: (args) => {
    let normalizedArgs = args;
    // port uglifyOptions to terserOptions when using terser webpack plugin
    if (isUsingTerser && args && args.uglifyOptions) {
      normalizedArgs = Object.assign({}, args);
      normalizedArgs.terserOptions = args.uglifyOptions;
      delete normalizedArgs.uglifyOptions;
    }

    return new UglifyJsPlugin(normalizedArgs);
  },
  isInstanceOfUglifyJsPlugin: (plugin) => plugin instanceof UglifyJsPlugin,
} : {
  makeUglifyJsPlugin: null,
  isInstanceOfUglifyJsPlugin: (plugin) => false,
};