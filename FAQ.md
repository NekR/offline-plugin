**Is it possible to minify `ServiceWorker` script output?**  
Yes, `offline-plugin` perfectly works with official `webpack.optimize.UglifyJsPlugin`, so if it's used your will get minified `ServiceWorker` script as well (no additional options required).

**Is there a way to match assets with dynamic file names, like compilation hash or version?**  
Yes, it's possible with `pattern matching`, which is performed by [minimatch](https://www.npmjs.com/package/minimatch) library.  
Example: ``main: ['index.html', 'scripts/main.*.js']``.