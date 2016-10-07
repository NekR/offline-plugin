var _exec = require('child_process').exec;
var _execSync = require('child_process').execSync;
var path = require('path');
var Promise = require('es6-promise').Promise;

var tests = [
  'basic',
  'cache-externals-absolute',
  'paths-generate-inside',
  'paths-generate-outside',
];

runAll(tests.map(function(testName) {
  return exec(path.join(__dirname, '../../node_modules/.bin/webpack'), {
    cwd: path.join(__dirname, testName),
    stdio: 'inherit'
  });
})).catch(function(data) {
  if (!_execSync) {
    process.stderr.write(data.stderr);
  }

  process.exit(data.error.code);
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

