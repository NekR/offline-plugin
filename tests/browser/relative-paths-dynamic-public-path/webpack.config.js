const path = require('path');
const { join } = path;

const OfflinePlugin = require(process.env.OFFLINE_PLUGIN_ROOT);
const CopyWebpackPlugin = require('copy-webpack-plugin');
const DefinePlugin = require('webpack/lib/DefinePlugin');

const webpackMajorVersion = require('webpack/package.json').version.split('.')[0];

const config = {
  entry: {
    main: join(__dirname, 'src/main.js'),
  },

  output: {
    path: join(__dirname, 'www/dist'),
    filename: '[name].js',
    chunkFilename: '[name].js',
    publicPath: '/'
  },

  plugins: [
    new CopyWebpackPlugin([
      { from: join(__dirname, 'src/index.html'), to: join(__dirname, 'www' ) }
    ]),
    new DefinePlugin({
      'process.env.OFFLINE_PLUGIN_ROOT': JSON.stringify(process.env.OFFLINE_PLUGIN_ROOT)
    }),
    new OfflinePlugin({
      relativePaths: true,
      ServiceWorker: {
        scope: '/'
      }
    })
  ]
};

if (webpackMajorVersion === '4') {
  config.mode = 'none';
}

module.exports = config;
