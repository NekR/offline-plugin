# `cacheMaps` option

This option allows to redirect request to a cache or another requests. Imagine your are developing your website with [_App-Shell pattern_](https://medium.com/google-developers/instant-loading-web-apps-with-an-application-shell-architecture-7c0c2f10c73) and you cache your app-shell as index page `/`. Now when user visits `/something-else` we need to server the same app-shell to them from the cache. It can be easily done with `cacheMaps`:

```js
new OfflinePlugin({
  cacheMaps: [
    {
      match: function(requestUrl) {
        return new URL('/', location);
      },
      requestTypes: ['navigate']
    }
  ]
})
```

Available properties on a map object:

* `match`: _string | RegExp | function_ -- matches an URL to map to a cache. If _function_ is specified it accepts 2 arguments: `URL` object of a request and `Request` itself as second argument. Return value of the specified function is used a new URL. It must be `URL` object.
* `to`: _string | function_ -- only used if `match` is a not a _function_. Each URL is matched with `urlString.replace(map.match, map.to)` so `to` option is the second argument to `String#replace` function being called on request url.
* `requestTypes`: _Array<string>_ -- An array of request types this map should be used with. Could be any combination of values: `'navigate'`, `'same-origin'`, `'cross-origin'`. Example: `requestTypes: ['navigate', 'same-origin']`