## rewrites

This callback will iterate the `assets.main` array in service worker file gerenated by the plugin. This will help developers to modify assets for various scenarios such as multiple cdn domains for assets. 

```javascript

rewrites: function(asset) {
	
	if (asset.endswith('html')) {
		return 'https://www.qq.com/' + asset;
	}
	else {
		return 'https://s1.url.cn/' + asset;
	}

	return asset;	
}

```