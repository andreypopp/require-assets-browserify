"use strict";

var fs            = require('fs');
var through       = require('through');
var jstransform   = require('jstransform');
var requireAssets = require('require-assets');
var resolve       = require('resolve/lib/sync');
var createVisitor = require('./visitor');

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
 *    % browserify -t require-assets/browserify ./assets.json ] ...
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
 *    % browserify -p [ require-assets/browserify --output ./assets.json ] ...
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

  var registry = requireAssets.getRegistry(options);
  var handlers = getHandlers([].concat(options.handler).filter(Boolean));

  b.transform(makeTransform(registry, handlers));

  b.on('bundle', function(stream) {
    stream.on('end', function() {
      fs.writeFile(output, JSON.stringify(registry.urlToFilename), function(err) {
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
 * Resolve and load handlers
 */
function getHandlers(handlers) {
  if (!handlers) {
    return {};
  // ['ext:id', ...]
  } else if (Array.isArray(handlers)) {
    var mapping = {};
    handlers.forEach(function(handler) {
      var split = handler.split(':');
      mapping[split[0]] = require(resolve(split[1]));
    });
    return mapping;
  // {ext: handler, ...}
  } else {
    return handlers;
  }
}

/**
 * Make new browserify transform which populates the registry.
 *
 * @private
 */
function makeTransform(registry, handlers) {

  return function(filename, options) {
    options = options || {};

    if (!handlers)
      handlers = getHandlers([].concat(options.handler).filter(Boolean));

    var registry = registry || requireAssets.getRegistry(options);

    return aggregate(function(src) {
      var visitor = createVisitor(filename, registry, handlers);
      var result = jstransform.transform([visitor], src);

      this.queue(result.code);
      this.queue(null);
    });
  }
}

