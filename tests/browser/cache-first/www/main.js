/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	const OfflinePlugin = __webpack_require__(1);

	OfflinePlugin.install();

/***/ },
/* 1 */
/***/ function(module, exports) {

	var appCacheIframe;

	function hasSW() {
	  return 'serviceWorker' in navigator &&
	    // This is how I block Chrome 40 and detect Chrome 41, because first has
	    // bugs with history.pustState and/or hashchange
	    (window.fetch || 'imageRendering' in document.documentElement.style) &&
	    (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname.indexOf('127.') === 0)
	}

	function install(options) {
	  options || (options = {});

	  
	    if (hasSW()) {
	      var registration = navigator.serviceWorker
	        .register(
	          "/sw.js"
	          
	        );

	      

	      return;
	    }
	  

	  
	}

	function applyUpdate(callback, errback) {
	  

	  
	}

	function update() {
	  
	    if (hasSW()) {
	      navigator.serviceWorker.getRegistration().then(function(registration) {
	        if (!registration) return;
	        return registration.update();
	      });
	    }
	  

	  
	}



	exports.install = install;
	exports.applyUpdate = applyUpdate;
	exports.update = update;


/***/ }
/******/ ]);