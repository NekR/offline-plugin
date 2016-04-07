import { Promise } from 'es6-promise';

import getSource from './misc/get-source';
import pathToBase from './misc/path-to-base';

export default class AppCache {
  constructor(options) {
    this.NETWORK = options.NETWORK;
    this.FALLBACK = options.FALLBACK;
    this.name = 'manifest';
    this.caches = options.caches;

    this.directory = options.directory
      .replace(/^\//, '')
      .replace(/\/$/, '') + '/';
    this.basePath = pathToBase(this.directory, true);
  }

  addEntry(plugin, compilation, compiler) {
    // no-op
    return Promise.resolve();
  }

  apply(plugin, compilation, compiler) {
    if (!Array.isArray(this.caches)) {
      throw new Error('AppCache caches must be an array');
    }

    const cache = (this.caches.reduce((result, name) => {
      const cache = plugin.caches[name];
      if (!cache || !cache.length) return result;

      if (result) {
        result = result.concat(cache);
      } else {
        result = cache;
      }

      return result;
    }, null) || []).map(
      plugin.relativePaths ? (path => this.basePath + path) : (a => a)
    );

    const path = this.directory + this.name;
    const manifest = this.getManifestTemplate(cache, plugin);
    const page = this.getPageTemplate(this.name);

    compilation.assets[path + '.appcache'] = getSource(manifest);
    compilation.assets[path + '.html'] = getSource(page);
  }

  getManifestTemplate(cache, plugin) {
    let tag;

    if (plugin.strategy === 'all') {
      tag = 'ver:' + plugin.version;
    }

    if (plugin.strategy === 'changed') {
      tag = 'tag:' + plugin.version;
    }

    if (plugin.strategy === 'hash') {
      tag = 'hash:' + plugin.hash;
    }

    let FALLBACK = '';
    let NETWORK = '';

    if (this.NETWORK) {
      NETWORK = 'NETWORK:\n' + (Array.isArray(this.NETWORK) ?
        this.NETWORK.join('\n') : this.NETWORK + '');
    }

    if (this.FALLBACK) {
      FALLBACK = 'FALLBACK:\n' + Object.keys(this.FALLBACK).map((path) => {
        return path + ' ' + this.FALLBACK[path];
      }).join('\n');
    }

    return `
      CACHE MANIFEST
      #${ tag }

      CACHE:
      ${ cache.join('\n') }

      ${ NETWORK }

      ${ FALLBACK }
    `.trim().replace(/^      */gm, '');
  }

  getPageTemplate(name, content) {
    return `
      <!doctype html>
      <html manifest="${ name }.appcache">${ content || '' }</html>
    `.trim().replace(/^      */gm, '');
  }

  getConfig(plugin) {
    return {
      directory: plugin.publicPath + this.directory,
      name: this.name
    };
  }
}