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
 */
function create(filename, registry) {
  registry = registry || requireAssets.currentRegistry();

  var basedir = path.dirname(filename);

  var visitor = function visitRequireAssets(traverse, node, path, state) {
    var id = node.arguments[0].value;
    var url = registry.makeURL(resolve(id, {basedir: basedir}));
    utils.catchup(node.range[0], state);
    utils.append(JSON.stringify(url), state);
    utils.move(node.range[1], state);
  };

  visitor.test = function(node, path, state) {
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

module.exports = create;
