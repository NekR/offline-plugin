var warn = "offline-plugin: runtime.install() was executed without OfflinePlugin being added to webpack.config.js. " +
  "The installation of offline-plugin has not been performed. " +
  "You can ignore this message if you are skipping the OfflinePlugin during development. " +
  "Otherwise, you may have a configuration issue.";

if (console.warn) {
  console.warn(warn);
} else if (console.log) {
  console.log(warn);
}

exports.install = function() {};
exports.applyUpdate = function() {};