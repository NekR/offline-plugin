# CHANGELOG

### 1.2

Remove support of multi-stage caching from `AppCache`. Reason is that files cached in second manifest cannot be accessed from page cached by first one, since `NETWORK` section can only dictate to use _network_ (`*`) or _nothing_ (pretend offline), but not _fallback to browser defaults_. This means that any attempt to access files of second manifest goes to the network or fails immediately, instead of reading from cache.

### 1.1

Fix `ServiceWorker` login to not cache `additional`'s section assets on `activate` event, instead, cache them without blocking any events. Other `ServiceWorker` logic fixes.

### 1.0

Release