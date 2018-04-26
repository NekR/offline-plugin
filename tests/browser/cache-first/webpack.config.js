const path = require('path');
const { resolve, join } = path;

const OfflinePlugin = require(process.env.OFFLINE_PLUGIN_ROOT);
const CopyWebpackPlugin = require('copy-webpack-plugin');
const DefinePlugin = require('webpack/lib/DefinePlugin');

const webpackMajorVersion = require('webpack/package.json').version.split('.')[0];

const config = {
  entry: {
    main: join(__dirname, 'src/main.js'),
  },

  output: {
    path: join(__dirname, 'www'),
    filename: '[name].js',
    chunkFilename: '[name].js',
    publicPath: '/'
  },

  plugins: [
    new CopyWebpackPlugin([
      { from: join(__dirname, 'src/index.html') },
      { from: join(__dirname, 'src/app-shell.html') }
    ]),
    new DefinePlugin({
      'process.env.OFFLINE_PLUGIN_ROOT': JSON.stringify(process.env.OFFLINE_PLUGIN_ROOT)
    }),
    new OfflinePlugin({
      appShell: '/app-shell.html',

      ServiceWorker: {
        navigationPreload: {
          map: (url) => {
            if (url.pathname === '/') {
              return '/api/index.json';
            }

            if (url.pathname === '/not-found') {
              return '/api/not-found.json';
            }
          },
          test: (url) => {
            if (url.pathname.indexOf('/api/') === 0) {
              return true;
            }
          }
        },
      },

      AppCache: false,
    })
  ]
};

if (webpackMajorVersion === '4') {
  config.mode = 'none';
}

module.exports = config;
