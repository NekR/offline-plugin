# FAQ

**Is it possible to minify `ServiceWorker` script output?**  
Yes, `offline-plugin` perfectly works with official `webpack.optimize.UglifyJsPlugin`, so if it's used you will get minified `ServiceWorker` script as well (no additional options required).

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

