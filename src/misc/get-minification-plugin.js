const webpack = require('webpack');
let MinificationPlugin;
let isUsingTerser = false;

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
  makeMinificationPlugin: (args) => {
    let normalizedArgs = args;
    // port uglifyOptions to terserOptions when using terser webpack plugin
    if (isUsingTerser && args && args.uglifyOptions) {
      normalizedArgs = Object.assign({}, args);
      normalizedArgs.terserOptions = args.uglifyOptions;
      delete normalizedArgs.uglifyOptions;
    }

    return new MinificationPlugin(normalizedArgs);
  },
  isMinificationPlugin: (plugin) => plugin instanceof MinificationPlugin,
} : {
  makeMinificationPlugin: null,
  isMinificationPlugin: (plugin) => false,
};