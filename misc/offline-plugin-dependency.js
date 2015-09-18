var ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');

function OfflinePluginDependency(request) {
  ModuleDependency.call(this, request);
  this.Class = OfflinePluginDependency;
}

module.exports = OfflinePluginDependency;

OfflinePluginDependency.prototype = Object.create(ModuleDependency.prototype);
OfflinePluginDependency.prototype.constructor = OfflinePluginDependency;
OfflinePluginDependency.prototype.type = 'offline-plugin-entry';