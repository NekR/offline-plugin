## This doc is still under development

* **`all`** strategy uses `version` passed to `options` as a cache tag. When version changes, old version cache is removed and new files are downloaded. Of course if files with the same name were not changed (HTTP status 304), the browser probably won't download them again and will just update cache.
* **`changed`** strategy is more advanced than `all` or `hash`. `offline-plugin` will calculate the files' hashes on it's own, independant of `webpack`. Even if a file is renamed, if the hash is the same, the file isn't redownloaded, but rather just renamed. **With this strategy enabled, `index.html` (or other files without dynamic name) should be placed in `main` section of the cache, otherwise they won't be revalidated**.
  * For `ServiceWorker` this means that only new files will be downloaded and missing files deleted from the cache.
  * For `AppCache` it's basically the same as previous strategies since `AppCache` revalidates all the assets. (HTTP status 304 rule still applies).
* `updateStrategy` does not apply to externals, as they're always revalidated/redownloaded on SW update.
