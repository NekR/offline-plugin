# Runtime

___________________________________

Besides plugin configuration, you also need to initialize it at runtime in your entry file. This is how you can do it:

```js
require('offline-plugin/runtime').install();
```

ES6/Babel/TypeScript

```js
import * as OfflinePluginRuntime from 'offline-plugin/runtime';
OfflinePluginRuntime.install();
```

> For more details of usage with `TypeScript` see [here](typescript.md)

## Methods

Runtime has following methods:

### `install(options: Object)`

Starts installation flow for `ServiceWorker`/`AppCache` it's safe and must be called each time your page loads (i.e. do not wrap it into any conditions).

### `applyUpdate()`

Used to apply update for existing installation. See `install` options below.

### `update()`

Performs check for updates of new `ServiceWorker`/`AppCache`.

## `install()` Options

Runtime `install` accepts 1 optional argument, `options` object. Right now you can use following runtime options:

_(right now `install()` accepts only Events and doesn't have any runtime configuration options)_

### Events

_**Note:** To use events, they must be explicitly enabled for each tool (`ServiceWorker`/`AppCache`) in their options._

#### `onInstalled`

Event called exactly once when `ServiceWorker` or `AppCache` is installed. Can be useful to display `"App is ready for offline usage"` message.

#### `onUpdating`

_Not supported for `AppCache`_

Event called when update is found and browsers started updating process. At this moment, some assets are downloading.

#### `onUpdateReady`

Event called when `onUpdating` phase finished. All required assets are downloaded at this moment and are ready to be updated. Call `runtime.applyUpdate()` to apply update.

#### `onUpdateFailed`

Event called when `onUpdating` phase failed by some reason. Nothing is downloaded at this moment and current update process in your code should be canceled or ignored.

#### `onUpdated`

Event called when update is applied, either by calling `runtime.applyUpdate()` or some other way by a browser itself.