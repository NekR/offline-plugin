const { exec, execSync, spawn, spawnSync } = require('child_process');

const path = require('path');
const fs = require('fs');
const del = require('del');
const glob = require('glob');
const webpack = require('webpack');
const Mocha = require('mocha');

const originalCWD = process.cwd();
const testsFolder = path.join(__dirname, 'browser/');

process.env.OFFLINE_PLUGIN_ROOT = originalCWD;

global.__SERVER__ = 'http://127.0.0.1:9090';
global.__SERVER_HOST__ = '127.0.0.1';
global.__SERVER_PORT__ = '9090';

global.__buildWebpack = (configPath) => {
  const config = require(path.resolve(configPath));

  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
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
  });
};

global.__createServer = (app) => {
  return new Promise((resolve) => {
    const server = app.listen(__SERVER_PORT__, __SERVER_HOST__, () => {
      resolve(server);
    });
  });
};

runSeparately();

function runSeparately() {
  const run = glob.sync(path.join(testsFolder, '**/test.js')).reduce((promise, file) => {
    return promise.then((failures) => {
      const mocha = new Mocha();
      mocha.addFile(file);
      process.chdir(path.dirname(file));

      return new Promise((resolve, reject) => {
        mocha.run((currentFailures) => {
          resolve(failures + currentFailures);
        });
      });
    });
  }, Promise.resolve(0));

  run.then((failures) => {
    process.chdir(originalCWD);
    process.exit(failures);
  });
}

function runAll() {
  const mocha = new Mocha({
    timeout: 30000,
  });

  glob.sync(path.join(testsFolder, '**/test.js')).forEach((file) => {
    mocha.addFile(file);
  });

  const r = mocha.run((failures) => {
    // process.exit(failures);
  });
}