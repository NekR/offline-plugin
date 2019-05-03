module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]'
}, {
  // wasm modules are only supported starting with webpack 4.
  // This test flag instructs the test harness to skip this test if we're
  // running with an older version of webpack.
  minimumWebpackMajorVersion: 4
});