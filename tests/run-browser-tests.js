const { exec, execSync, spawn, spawnSync } = require('child_process');

const path = require('path');
const fs = require('fs');
const del = require('del');
const webpack = require('webpack');
const Mocha = require('mocha');

const originalCWD = process.cwd();

process.env.OFFLINE_PLUGIN_ROOT = originalCWD;

const testFolder = path.join(__dirname, 'browser/basic-with-preload');
const webpackConfig = require(path.join(testFolder, 'webpack.config.js'));

new Promise((resolve, reject) => {
  webpack(webpackConfig, (err, stats) => {
    if (err) {
      reject(err);
      return;
    }

    if (stats.compilation.warnings.length) {
      reject(stats.compilation.warnings);
      return;
    }

    if (stats.compilation.errors.length) {
      reject(stats.compilation.errors);
      return;
    }

    resolve();
  });
}).then(() => {
  return require(path.join(testFolder, 'server.js'));
}).then(() => {
  const mocha = new Mocha();

  mocha.addFile(path.join(testFolder, 'test.js'));
  mocha.run((failures) => {
    process.exit(failures);
  });
}).then(() => {
  // process.exit(0);
}).catch(err => console.error(err));