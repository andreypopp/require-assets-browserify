"use strict";

var fs            = require('fs');
var through       = require('through');
var jstransform   = require('require-assets-jstransform');
var requireAssets = require('require-assets');

/**
 * Browserify entry point, decides which one to activate — transform or plugin.
 *
 * @public
 *
 * @param {Browserify|String} b
 * @param {Object} options
 */
module.exports = function requireAssetsBrowserify(b, options) {
  if (typeof b.bundle === 'function' && typeof b.transform === 'function') {
    return plugin(b, options);
  } else {
    return transform(b, options);
  }
}

/**
 * Browserify transform to rewrite requireAssets(...) calls to URLs.
 *
 * Command line usage:
 *
 *    % browserify -t require-assets-browserify ...
 *
 * @public
 *
 * @param {String} filename
 * @param {Object} options
 */
var transform = makeTransform();

/**
 * Browserify plugin to rewrite requireAssets(...) calls to URLs and dump
 * registry in file.
 *
 * Command line usage:
 *
 *    % browserify -p [ require-assets-browserify --output ./assets.json ] ...
 *
 * @param {Browserify} b
 * @param {Object} options
 */
function plugin(b, options) {
  var output = options && (options.o || options.output);

  if (!output) {
    throw new Error(
      'provide output for require-assets/browserify: ' +
      'browserify -p [ require-assets/browserify --output ./url-filename.json ] ...');
  }

  var registry = registryFromOptions(options);

  b.transform(makeTransform(registry));

  b.on('bundle', function(stream) {
    stream.on('end', function() {
      fs.writeFile(output, JSON.stringify(registry), function(err) {
        if (err) stream.emit('error', err);
      });
    });
  });

  return b;
}

/**
 * Aggregate stream and call a callback.
 *
 * @private
 *
 * @param {Function.<String>} cb
 */
function aggregate(cb) {
  var src = '';
  return through(
    function(c) { src += c; },
    function() { cb.call(this, src); }
  );
}

/**
 * Make new browserify transform which populates the registry.
 *
 * @private
 */
function makeTransform(registry) {

  return function(filename, options) {
    options = options || {};

    var registry = registry || registryFromOptions(options);

    return aggregate(function(src) {
      try {
        src = jstransform(src);
      } catch(err) {
        return this.emit('error', err);
      }
      this.queue(src);
      this.queue(null);
    });
  }
}

/**
 * Get registry from options
 */
function registryFromOptions(options) {
  if (options.requireAssets && options.mapping)
    return options;
  if (options.prefix || options.root)
    return requireAssets.createRegistry(options);
  return requireAssets.currentRegistry();
}
