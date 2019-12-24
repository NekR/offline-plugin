const OfflinePlugin = require(process.env.OFFLINE_PLUGIN_ROOT + '/runtime');

__webpack_public_path__ = '/dist/';

OfflinePlugin.install();
