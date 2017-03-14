# Contributing to `offline-plugin`
_(feel free to ask questions if you struggle anything trying this)_


## Choosing a Branch

Typically you want to send your PRs against `master` branch. Other branches such `v3`, `v4`, etc. are used for tracking previous major versions of `offline-plugin` and typically shouldn't be touched.

## Installation / prepare

* `npm install`
* `npm run install:build-deps`

## Development

Project structure:

* `src/` ES6 source code
* `lib/` ES5 generated code, shouldn't be touched directly
* `tpls/` tpls to generate dynamic files, e.g. `offline-plugin/runtime`


Before submitting a PR you have to run `npm run build` to transpile scripts from `src/` to `lib/` (also you can use `npm run watch`). Also make sure to run `npm test` before you perform any changes, to not break other things.

If you are adding a new feature, make sure to write tests for it

## Writing tests

Tests are located in `tests/legacy/fixtures` folder. Right now it's only webpack generated code fixtures, no ServiceWorker tests yet. Just copy most similar to your case test (e.g. `basic`) and adopt it for the new feature.

## Thank you!
