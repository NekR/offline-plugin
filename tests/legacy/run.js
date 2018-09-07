var _exec = require('child_process').exec;
var _execSync = require('child_process').execSync;
var path = require('path');
var fs = require('fs');
var del = require('del');
var webpack = require('webpack');

var compare = require('./compare');

var originalCWD = process.cwd();
var fixturesPath = path.join(__dirname, 'fixtures');
var tests = fs.readdirSync(fixturesPath).filter(function(file) {
  if (fs.statSync(path.join(fixturesPath, file)).isDirectory()) {
    return true;
  }

  return false;
});

global.__ROOT__ = originalCWD;
global.__CONFIG__ = require('./config');

var allTests = [];

tests.reduce(function(last, testName) {
  /*return exec(path.join(__dirname, '../../node_modules/.bin/webpack'), {
    cwd: path.join(__dirname, testName),
    stdio: 'inherit'
  });*/

  if (testName.indexOf('__') === 0) {
    return Promise.resolve();
  }

  var testDir = path.join(fixturesPath, testName);

  return last.then(function() {
    cleanOutput(testDir);
  }).then(function() {
    var test = new Promise(function(resolve, reject) {
      // var config = fs.readFileSync(path.join(testDir, 'webpack.config.js'), 'utf-8');
      process.chdir(testDir);
      var config = require(path.join(testDir, 'webpack.config.js'));

      webpack(config, function(err, stats) {
        compare(testDir).then(function() {
          if (err) {
            reject(err);
            return;
          }

          if (stats.compilation.warnings.length) {
            console.warn('Warnings:');
            stats.compilation.warnings.forEach(function (warning) {
              console.warn(warning);
            });
            reject(new Error('encountered at least one warning'));
            return;
          }

          if (stats.compilation.errors.length) {
            console.error('Errors:');
            stats.compilation.errors.forEach(function (error) {
              console.error(error);
            });
            reject(new Error('encountered at least one error'));
            return;
          }

          resolve();
        }).catch(reject);
      });
    }).catch(function (err) {
      if (err instanceof Error && err.message === 'unsupported webpack version') {
        var testName = path.basename(testDir);
        console.log('Skipping: ' + testName + '\n  because of unsupported webpack version');
        return;
      }
      throw err;
    });

    allTests.push(test);
    return test.catch(function() {});
  });
}, Promise.resolve()).then(function() {
  return Promise.all(allTests);
}).then(function() {
  process.chdir(originalCWD);
}).catch(function(error) {
  /*if (!_execSync) {
    process.stdout.write(data.stdout);
    process.stderr.write(data.stderr);
  }*/

  if (error) {
    console.error(error);
  }

  process.exit(error && isFinite(error.code) ? error.code : 1);
});

function cleanOutput(testDir) {
  return del([path.join(testDir, '__output', '**/*')])
    .catch(function() {});
}

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

