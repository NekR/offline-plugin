var _exec = require('child_process').exec;
var _execSync = require('child_process').execSync;
var path = require('path');
var fs = require('fs');
var webpack = require('webpack');

var tests = [
  'basic',
  'cache-externals-absolute',
  'paths-generate-inside',
  'paths-generate-outside',
];

var originalCWD = process.cwd();
var fixturesPath = path.join(__dirname, 'fixtures');
var tests = fs.readdirSync(fixturesPath).filter(function(file) {
  if (fs.statSync(path.join(fixturesPath, file)).isDirectory()) {
    return true;
  }

  return false;
});

global.__CONFIG__ = require('./config');

tests.reduce(function(last, testName) {
  /*return exec(path.join(__dirname, '../../node_modules/.bin/webpack'), {
    cwd: path.join(__dirname, testName),
    stdio: 'inherit'
  });*/

  return last.then(function() {
    return new Promise(function(resolve) {
      var testDir = path.join(fixturesPath, testName);
      // var config = fs.readFileSync(path.join(testDir, 'webpack.config.js'), 'utf-8');
      process.chdir(testDir);
      var config = require(path.join(testDir, 'webpack.config.js'));

      webpack(config, function(err, stats) {
        if (err) {
          console.error(err);
        }

        resolve();
      });
    });
  });
}, Promise.resolve()).then(function() {
  process.chdir(originalCWD);
}).catch(function(data) {
  /*if (!_execSync) {
    process.stdout.write(data.stdout);
    process.stderr.write(data.stderr);
  }*/

  console.error('catch', data);

  // process.exit(data.error ? data.error.code : 1);
});

function exec(cmd, options) {
  return function() {
    return new Promise(function(resolve, reject) {
      options || (options = {});

      if (_execSync) {
        _execSync(cmd, options);
        resolve();
        return;
      }

      _exec(cmd, options, function(error, stdout, stderr) {
        var data = {
          error: error,
          stderr: stderr
        };

        if (error) {
          reject(data);
          return;
        }

        process.stdout.write(stdout);
        resolve();
      });
    })
  };
}

function runAll(all) {
  return all.reduce(function(result, run) {
    return result.then(run);
  }, Promise.resolve());
}

