# CHANGELOG

### 2.1.0

* Allow pattern matching in `externals`

### 3.0.0

* All assets are now requested cache-bust query parameter (`__uncache=${ Date.now() }`)
* Matching assets in cache now uses `ignoreSearch` search option of `CacheQueryOptions`, with [sw-cache-options](https://github.com/NekR/sw-cache-options) polyfill for Chrome.
* Rename `scope` option to `publicPath` (`scope` is deprecated now and will produce warnings upon use)
* Make `publicPath` `''` (empty string) by default
* Make `relativePaths` `true` by default
* Cache sections `'additional'` and `'optional'` are now allowed only when `updateStrategy`option is set to `'changed'`
* `updateStrategy: `changed`` now uses `version` option instead of compilation hash.
* Version now is not set by default and returns compilation hash for `updateStrategy: 'changed`` and `version` for `updateStrategy: 'all'` (when not set)

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
