<table>
  <tr>
    <td>
      <div align="center">
        <img src="https://rawgit.com/NekR/offline-plugin/master/logo/logo.svg" width="120" alt="offline-plugin logo">
      </div>
    </td>
    <td>
      <h1>`offline-plugin` for webpack</h1>
      [![npm](https://img.shields.io/npm/v/offline-plugin.svg?maxAge=3600&v4)](https://www.npmjs.com/package/offline-plugin)
      [![npm](https://img.shields.io/npm/dm/offline-plugin.svg?maxAge=3600)](https://www.npmjs.com/package/offline-plugin)
      [![Join the chat at https://gitter.im/NekR/offline-plugin](https://badges.gitter.im/NekR/offline-plugin.svg)](https://gitter.im/NekR/offline-plugin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
    </td>
  <tr>
<table>

This plugin is intended to provide an offline experience for **webpack** projects. It uses **ServiceWorker**, and **AppCache** as a fallback under the hood. Simply include this plugin in your ``webpack.config``, and the accompanying runtime in your client script, and your project will become offline ready by caching all (or some) of the webpack output assets.


[[Demo] Progressive Web App built with `offline-plugin`](https://offline-plugin.now.sh/) ([source code of the demo](https://github.com/NekR/offline-plugin-pwa))

## Install

`npm install offline-plugin [--save-dev]`

## Setup

First, instantiate the plugin with [options](#options) in your `webpack.config`:

```js
// webpack.config.js example

var OfflinePlugin = require('offline-plugin');

module.exports = {
  // ...

  plugins: [
    // ... other plugins
    // it always better if OfflinePlugin is the last plugin added
    new OfflinePlugin()
  ]
  // ...
}

```

Then, add the [runtime](docs/runtime.md) into your entry file (typically main entry):

```js
require('offline-plugin/runtime').install();
```

ES6/Babel/TypeScript
```js
import * as OfflinePluginRuntime from 'offline-plugin/runtime';
OfflinePluginRuntime.install();
```

> For more details of usage with `TypeScript` see [here](docs/typescript.md)

## Docs

* [Caches](docs/caches.md)
* [Update process](docs/updates.md)
* [Cache Maps](docs/cache-maps.md)
* [Runtime API](docs/runtime.md)
* [Configuration options](docs/options.md)
* [FAQ](FAQ.md)

## Articles

* [Easy Offline First Apps With Webpack's Offline Plugin](https://dev.to/kayis/easy-offline-first-apps-with-webpacks-offline-plugin)

## Options

**All options are optional and `offline-plugin` can be used without specifying them.**

### [See all available options here.](docs/options.md)

## Who is using `offline-plugin`

### Projects

* [React Boilerplate](https://github.com/mxstbr/react-boilerplate)
* [Phenomic](https://phenomic.io)
* [React, Universally](https://github.com/ctrlplusb/react-universally)

### PWAs

* [`offline-plugin` PWA](https://offline-plugin.now.sh/)
* [Offline Kanban](https://offline-kanban.herokuapp.com) ([source](https://github.com/sarmadsangi/offline-kanban))
* [Preact](https://preactjs.com/) ([source](https://github.com/developit/preact-www))
* [Omroep West (_Proof of Concept_)](https://omroep-west.now.sh/)


_If you are using `offline-plugin`, feel free to submit a PR to add your project to this list._

## Like `offline-plugin`?

Support it by giving [feedback](https://github.com/NekR/offline-plugin/issues), contributing or just by 🌟 starring the project!


## License

[MIT](LICENSE.md)  
[Logo](logo/LICENSE.md)

## CHANGELOG

[CHANGELOG](CHANGELOG.md)
