var path = require('path');
var child_process = require('child_process');

var _package = require(path.resolve('package.json'));
var buildDeps = _package.buildDependencies;

Object.keys(buildDeps).forEach(function(dep) {
  child_process.execSync('npm install ' + dep + '@' + buildDeps[dep], {
    stdio: 'inherit',
    cwd: path.resolve()
  });
});