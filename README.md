# `offline-plugin` for webpack

This plugin is intended to provide offline experience for **webpack** projects. It uses **ServiceWorker** and **AppCache** as a fallback under the hood. Simply include this plugin in your ``webpack.config``, and the accompanying runtime in your client script, and your project will become offline ready by caching all (or some) output assets.

## Install

`npm install offline-plugin [--save-dev]`

## Setup

First, instantiate the plugin with [options](#options) in your `webpack.config`:

```js
// webpack.config.js example

var OfflinePlugin = require('offline-plugin');

module.exports = {
  // ...

  plugins: [
    // ... other plugins
    // it always better if OfflinePlugin is the last plugin added
    new OfflinePlugin()
  ]
  // ...
}

```

Then, install the [runtime](#runtime) in your client script:

```js
require('offline-plugin/runtime').install();
```

## Options

**All options are optional and `offline-plugin` could be used without specifying them.** Also see full list of default options [here](https://github.com/NekR/offline-plugin/blob/master/src/index.js#L9).

#### `caches: 'all' | Object`

Tells to the plugin what to cache and how.

* `'all'`: means that everything (all the webpack output assets) will be cached on install.
* `Object`: Object with 3 possible `Array<string>` sections (properties): `main`, `additional`, `optional`. All sections are optional and by default are empty (no assets added).

[More details about `caches`](docs/caches.md)

> Default: `'all'`.

#### `publicPath: string`

Same as `publicPath` for `webpack` options, only difference is that absolute paths are not allowed  

> __Example:__  
Correct value: `/project/`  
Incorrect value: `https://example.com/project`

#### `updateStrategy: 'changed' | 'all'`
Cache update strategy. [More details about `updateStrategy`](docs/update-strategies.md)  
> Default: `'changed'`.
    
#### `externals: Array<string>`.
Explicitly marks the assets as _external_ assets that you can cache. If cache asset is not one of _webpack's generated assets_ and is not marked explicitly as _external_, you will receive warning about it into console. To cache external assets, add them to the `caches` object, by default `caches: 'all'` doesn't cache `externals`.

> Default: `null`  
> **Example value:** `['fonts/roboto.woff']`

#### `excludes: Array<string | globs_pattern>`
Excludes matches assets from being added to caches. Exclusion is performed before _rewrite_ happens.  
[Learn more about assets _rewrite_](docs/rewrite.md)

> Default: `['**/.*', '**/*.map']`  
> _Excludes all files which start with `.` or end with `.map`_

#### `relativePaths: boolean`
When set to `true`, all cache asset paths are generated relatively to `ServiceWorker` file or `AppCache` folder respectively.  
`publicPath` option is ignored when this is set to `true`.
> **Default:** `true`

#### `version: string | (plugin: OfflinePlugin) => void`
Version of the cache. Might be a function, useful in _watch-mode_ when you need to apply dynamic value.

* `Function` is called with plugin instance as first argument
* `string` can be interpolated with `[hash]` token

> Default: _Current date_.

#### `rewrites: Function | Object`

Rewrite function or rewrite map (`Object`). Useful when assets are served in a different way from the client perspective, e.g. usually `index.html` is served as `/`.

[See more about `rewrites` option and default function](docs/rewrite.md)

#### `ServiceWorker: Object | null | false`

Settings for the `ServiceWorker` cache. Use `null` or `false` to disable `ServiceWorker` generation.

* `output`: `string`. Relative (from the _webpack_'s config `output.path`) output path for emitted script.  
_Default:_ `'sw.js'`.
* `entry`: `string`. Relative or absolute path to file which will be used as `ServiceWorker` entry. Useful to implement additional function or handle other SW events.  
_Default:_ _empty file_
* `scope`: `string`. Reflects [ServiceWorker.register](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)'s `scope` option.  
_Default:_ `null`
* `navigateFallbackURL`: `string`. The URL being returned from the caches when requested navigation URL isn't available. Similar to `AppCache.FALLBACK` option.  
_Example:_ `navigateFallbackURL: '/'`
* `events`: `boolean`. Enables runtime events for ServiceWorker. For supported events see `Runtime`'s `install()` options.
_Default:_ `false`.

#### `AppCache: Object | null | false`

Settings for the `AppCache` cache. Use `null` or `false` to disable `AppCache` generation.

* `NETWORK`: `string`. Reflects `AppCache`'s `NETWORK` section.  
_Default:_ `'*'`.
* `directory`: `string`. Relative (from the _webpack_'s config `output.path`) output directly path for the `AppCache` emitted files.  
_Default:_ `'appcache/'`.
* `events`: `boolean`. Enables runtime events for AppCache. For supported events see `Runtime`'s `install()` options.  
_Default:_ `false`.
* `FALLBACK`: `Object`. Reflects `AppCache`'s `FALLBACK` section. Useful for single page applications making use of HTML5 routing or for displaying custom _Offline page_.  
_Example 1:_ `{ '/blog': '/' }` will map all requests starting with `/blog` to the domain roboto when request fails.  
_Example 2:_ `{ '/': '/offline-page.html' }` will return contents of `/offline-page.html` for any failed request.  
_Default:_ `null`.

## Runtime

Besides plugin configuration, you also need to initialize it at runtime phase. It's done this way:

```js
require('offline-plugin/runtime').install();
```

### Methods

Runtime has following methods:

#### `install(options: Object)`

Starts installation flow for `ServiceWorker`/`AppCache` it's safe and must be called each time your page loads (i.e. do not wrap it into any conditions).

#### `applyUpdate()`

Used to apply update for existing installation. See `install` options below.

### `install` Options

Runtime `install` accepts 1 optional argument, `options` object. Right now you can use following runtime options:

_**Note:** Events must be explicitly enabled for each tool (`ServiceWorker`/`AppCache`) in their options._

#### `onInstalled`

Event called exactly once when `ServiceWorker` or `AppCache` is installed. Can be useful to display `"App is ready for offline usage"` message.

#### `onUpdating`

_Not supported for `AppCache`_

Event called when update is found and browsers started updating process. At this moment, some assets are downloading.

#### `onUpdateReady`

Event called when `onUpdating` phase finished. All required assets are downloaded at this moment and are ready to be updated. Call `runtime.applyUpdate()` to apply update.

#### `onUpdateFailed`

Event called when `upUpdating` phase failed by some reason. Nothing is downloaded at this moment and current update process in your code should be canceled or ignored.

#### `onUpdated`

Event called when update is applied, either by calling `runtime.applyUpdate()` or some other way by a browser itself.


## FAQ

**Is it possible to minify `ServiceWorker` script output?**  
Yes, `offline-plugin` perfectly works with official `webpack.optimize.UglifyJsPlugin`, so if it's used your will get minified `ServiceWorker` script as well (no additional options required).

**Is there a way to match assets with dynamic file names, like compilation hash or version?**  
Yes, it's possible with `pattern matching`, which is performed by [minimatch](https://www.npmjs.com/package/minimatch) library.  
Example: ``main: ['index.html', 'scripts/main.*.js']``.


## License

[MIT](LICENSE.md)


## CHANGELOG

### 3.4.0

* Added `ServiceWorker.navigateFallbackURL` option (see #71)
* Added warning about development mode in `runtime.js` when used without `OfflinePlugin` in `webpack.config.js` (see #74)

### 3.3.0

* Fixed absolute URLs being prefixed with relative path when `relativePaths: true` is used ([#39](https://github.com/NekR/offline-plugin/issues/39), [#60](https://github.com/NekR/offline-plugin/issues/60))
* Added `scope` option to ServiceWorker ([#19](https://github.com/NekR/offline-plugin/issues/19)). See [ServiceWorker.register](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register) docs.

### 3.0.0

* All assets are now requested cache-bust query parameter (`__uncache=${ Date.now() }`)
* Assets matching in caches now ignores search (query) path of URLs
* Rename `scope` option to `publicPath` (`scope` is deprecated now and will produce warnings upon use)
* Make `publicPath: ''` (empty string) by default
* Make `relativePaths: true` by default
* Cache sections `'additional'` and `'optional'` are now allowed only when `updateStrategy`option is set to `'changed'`
* `changed` is now default `updateStrategy` and `hash` strategy is gone. `offline-plugin` now uses webpack's build hashes to apply `change` update strategy even when generate file names are the same. [Issue 6](https://github.com/NekR/offline-plugin/issues/6). More details about change in docs.
* Any of `updateStrategy` is now using `version` option for its version tag
* `version` now is not set by default and returns (when not set, e.g. default) compilation hash for `updateStrategy: 'changed'` and `version` for `updateStrategy: 'all'`
* `version` now has interpolation value, use `[hash]` to insert compilation hash to your version string
* `install()` method signature now is `install(options)` (callbacks are removed)
* Runtime events are not implemented for ServiceWorker (and some for AppCache): `onUpdating`, `onUpdateReady`, `onUpdated`, `onInstalled`.  
  Example: `runtime.install({ onInstalled: () => ... })`
* Added `applyUpdate()` method to runtime
* Absolute URLs can now be specified in `caches` as any other assets (they are required to be marked as `externals`)
* Added basic test and Travis CI

______________________________________________

More info in [CHANGELOG](CHANGELOG.md)
