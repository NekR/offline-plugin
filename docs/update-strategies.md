# This doc is still under development

___________________________________

* **`all`** strategy uses `version` passed to [`options`](options.md) as a cache tag. When version changes, old version cache is removed and new files are downloaded. Of course if files with the same name were not changed (HTTP status 304), the browser probably won't download them again and will just update cache.
* **`changed`** strategy is more advanced than `all`. `offline-plugin` will calculate the files' hashes on it's own, independent of `webpack`s hash calculation. Even if a file is renamed, if the hash is the same, it will not be downloaded again, but rather just renamed. **With this strategy enabled, `index.html` (or other files without dynamic name) should be placed in `main` section of the cache, otherwise they won't be revalidated**.
  * For `ServiceWorker` this means that only new/changed files will be downloaded and missing files deleted from the cache.
  * `AppCache` does not support the `changed` strategy and will always use the `all` strategy.
* `updateStrategy` does not apply to `externals`, as they're always revalidated/redownloaded on `ServiceWorker` update.
