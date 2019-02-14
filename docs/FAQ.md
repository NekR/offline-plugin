# FAQ

___________________________________

**Is it possible to minify `ServiceWorker` script output?**  
Yes, `offline-plugin` perfectly works with official `webpack.optimize.UglifyJsPlugin` and `terser-webpack-plugin`. If used, the `ServiceWorker` script will be minified as well (no additional options required).

**Is there a way to match assets with dynamic file names, like compilation hash or version?**  
Yes, it's possible with `pattern matching`, which is performed by [minimatch](https://www.npmjs.com/package/minimatch) library.  
Example: ``main: ['index.html', 'scripts/main.*.js']``.

**Is there a way to prevent/disable console logging?**  
Yes, you can disable/prevent console logging when `webpack.optimize.UglifyPlugin` is used with `compress.drop_console` option. Example:

```js
new webpack.optimize.UglifyPlugin({
  compress: {
    drop_console: true,
  }
})
```
`offline-plugin` automatically detects usage of `UglifyPlugin` and applies it to its generated code.

**Why does the use of `{ mode: 'no-cors' }` return an error when used?**  
This is because the [opaque request](http://stackoverflow.com/questions/36292537/what-is-an-opaque-request-and-what-it-serves-for) made doesn't give us access to the returned response code. We are therefore unable to determine the asset is valid. In this situation we avoid caching potential erroneous requests. Please ensure anything to be cached responds with valid CORS headers. 

**Why isn't my SPA working in offline mode?**  
There is probably something wrong with your configuration. See the [SPA example](examples/SPA.md)

**How can I notify users that a new version of my webpage is available?**  
In the `offline-plugin/runtime`'s `install` method, you can pass a config object with event hooks, one of which is the `onUpdateReady`, that fires when all required assets are downloaded and ready to be updated. In this callback, you can either call `runtime.applyUpdate()` to apply updates directly, or in some way prompt for user input, and then apply them. See [`install-options`](runtime.md#install-options) and the [offline-plugin.pwa example](https://github.com/NekR/offline-plugin-pwa/blob/master/src/main.js)
```js
onUpdateReady: function() {
  OfflinePlugin.applyUpdate();
}
 ```

**How can I use absolute paths?**  
By default `offline-plugin` uses `relativePaths: true`. You can override this by setting an (absolute) `publicPath`. This makes `offline-plugin` ignore `relativePaths`:

```js
new OfflinePlugin({
  publicPath: '/'
})
```