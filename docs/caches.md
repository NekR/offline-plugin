# Caches

___________________________________

## Definition

### `caches: 'all' | Object`

Tells to the plugin what to cache and how.

* `'all'`: means that everything (all the webpack output assets) and URLs listed in `externals` option will be cached on install.
* `Object`: Object with 3 possible sections (properties) of type `Array<string | RegExp>`: `main`, `additional`, `optional`. All sections are optional and by default are empty (no assets added).

> Default: `'all'`.

___________________________________

## Advanced usage

Pass an `Object` to `caches` option to manually specify how to cache build assets.

> Example:
```js
caches: {
  main: [':rest:'],
  additional: [':externals:'],
  optional: ['*.chunk.js']
}
```

In this example assets which ends with `.chunk.js` are added to `optional` cache, _external_ assets added to `additional` cache and _rest_ of the assets are added to `main` cache.

Use special keyword `:rest:` to match all unused/uncached assets. To match multiple assets or assets with dynamic names, use [pattern matching](https://www.npmjs.com/package/minimatch). To add external assets (from outside of your webpack build), list them in `externals` option and then use `:externals:` keyword in `caches`. If you don't want to put all `externals` into the same section, you can list those assets manually (e.g. `additional: ['/external.js']`) instead of using `:externals:` keyword.

### Cache sections

* `main`: Assets listed in this section are cached first (on `install` event in `ServiceWorker`) and if caching of this section fails -- no assets are cached at all. Hence, it should contain most important set of assets (for example `['index.html', 'main.js']`), without which your website won't work.
* `additional`: **By default enabled only in `ServiceWorker`**. Assets in this section are loaded after `main` section is successfully loaded (on `activate` event in ServiceWorker). If any of assets fails to download, then nothing is cached from the `additional` section and all the assets are moved to the `optional` section. If **current update strategy** is `changed`, then only failed to download assets are moved to the `optional` section, all other are successfully cached.
* `optional`: **By default enabled only in `ServiceWorker`**. Assets in this sections are cached only when they are fetched from the server. `ServiceWorker` won't download them ahead of time.

> **Note:**
AppCache doesn't support conditional or delayed assets loading and by default ignores assets in `additional` and `optional` sections. To make AppCache cache all sections, set this option:
```js
 AppCache: {
  caches: ['main', 'additional', 'optional']
 }
```
