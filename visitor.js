"use strict";

var path          = require('path');
var Syntax        = require('esprima-fb').Syntax;
var utils         = require('jstransform/src/utils');
var requireAssets = require('require-assets');
var resolve       = require('resolve/lib/sync');

var NAME = 'requireAssets';

/**
 * Create a new visitor to replace requireAssets(..) calls
 *
 * @public
 *
 * @param {String} filename
 * @param {AssetRegistry} registry
 * @param {Object} handlers
 */
function create(filename, registry, handlers) {
  registry = registry || requireAssets.currentRegistry();

  var basedir = path.dirname(filename);

  var visitor = function visitRequireAssets(traverse, node, p, state) {
    var id = node.arguments[0].value;
    var filename = resolve(id, {basedir: basedir});
    var extname = path.extname(filename);
    var handler = handlers[extname] ? handlers[extname] : defaultHandler;
    var url = registry.makeURL(filename);

    utils.catchup(node.range[0], state);
    utils.append(handler(url, filename, registry), state);

    utils.move(node.range[1], state);
  };

  visitor.test = function(node, p, state) {
    return (
      node.type === Syntax.CallExpression && 
      node.callee.type === Syntax.Identifier &&
      node.callee.name === NAME &&
      node.arguments[0] &&
      node.arguments[0].type === Syntax.Literal
    );
  };

  return visitor;
}

function defaultHandler(url) {
  return JSON.stringify(url);
}

module.exports = create;
