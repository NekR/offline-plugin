var exec = require('child_process').execSync;
var path = require('path');

exec(path.join(__dirname, '../node_modules/.bin/webpack'), {
  cwd: path.join(__dirname, 'basic')
});