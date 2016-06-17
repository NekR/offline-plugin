# CHANGELOG

### 3.4.0

* Added `ServiceWorker.navigateFallbackURL` option (see #71)
* Added warning about development mode in `runtime.js` when used without `OfflinePlugin` in `webpack.config.js` (see #74)

### 3.3.0

* Fixed absolute URLs being prefixed with relative path when `relativePaths: true` is used ([#39](https://github.com/NekR/offline-plugin/issues/39), [#60](https://github.com/NekR/offline-plugin/issues/60))
* Added `scope` option to ServiceWorker ([#19](https://github.com/NekR/offline-plugin/issues/19)). See [ServiceWorker.register](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register) docs.

### 3.0.0 - 3.2.0

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

### 2.2.0

* Disallow pattern matching in `externals`

### 2.1.0

* Allow pattern matching in `externals`

### 2.0.0

* Added `relativePaths` option. When `true`, all generated paths are relative to `ServiceWorker` file or `AppCache` folder. Useful in cases when app isn't in the root of domain, e.g. Github Pages. Setting `scope` to `''` (empty string) is the same now as `relativePaths: true`.
* Added `excludes` option to exclude assets from caches. Exclusion is global and is performed before any assets added to cache sections.
* Not specified sections in caches now equals to empty selection. Previously, `:rest:` keyword was added automatically, now isn't.
* ':rest:' keyword is now handled after all caches sections were handled. Previously it was handled immediately when found.
* Plugin now throws an error when keyword `:rest:` is used more than once.
* `ServiceWorker` generation now used Child Compilation instead weird hacks with entry injections.

### 1.3.1

Improved `ServiceWorker` entry generation: use `compilation.namedChunks` instead of `compilation.assets` to access service-entry and replace it. See #10 for more details.

### 1.3

Added `FALLBACK` back section for `AppCache` and fixed generation of a `NETWORK` section.

### 1.2

Remove support of multi-stage caching from `AppCache`. Reason is that files cached in second manifest cannot be accessed from page cached by first one, since `NETWORK` section can only dictate to use _network_ (`*`) or _nothing_ (pretend offline), but not _fallback to browser defaults_. This means that any attempt to access files of second manifest goes to the network or fails immediately, instead of reading from cache.

### 1.1

Fix `ServiceWorker` login to not cache `additional`'s section assets on `activate` event, instead, cache them without blocking any events. Other `ServiceWorker` logic fixes.

### 1.0

Release
