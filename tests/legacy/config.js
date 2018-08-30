var OfflinePlugin = require(__ROOT__);
var path = require('path');

var deepExtend = require('deep-extend');
var DefinePlugin = require('webpack/lib/DefinePlugin');
var compare = require('./compare');

var webpackMajorVersion = require('webpack/package.json').version.split('.')[0];

module.exports = function(OfflinePluginOptions, testFlags) {
  testFlags = testFlags || {};

  if (testFlags.minimumWebpackMajorVersion &&
      parseInt(webpackMajorVersion, 10) < testFlags.minimumWebpackMajorVersion) {
    throw new Error('unsupported webpack version');
  }
  delete testFlags.minimumWebpackMajorVersion;

  var testDir = process.cwd();
  var outputPath = path.join(testDir, '__output');

  OfflinePluginOptions.__tests = deepExtend({
    swMetadataOnly: true,
    ignoreRuntime: true,
    noVersionDump: true,
    appCacheEnabled: true,
    pluginVersion: '999.999.999'
  }, testFlags);

  var config = {
    bail: true,
    entry: {
      main: 'main.js'
    },

    output: {
      path: outputPath,
      filename: '[name].js',
    },

    plugins: [
      new OfflinePlugin(OfflinePluginOptions),
      new DefinePlugin({
        RUNTIME_PATH: JSON.stringify(path.join(__ROOT__, 'runtime'))
      }),
    ],

    resolve: {
      modules: [
        path.join(testDir),
        'node_modules'
      ],
      extensions: ['.js']
    }
  };

  if (webpackMajorVersion === '4') {
    config.mode = 'none';
    config.resolve.extensions.push('.wasm');
  }

  return config;
};