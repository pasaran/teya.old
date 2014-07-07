var Factory = require( './factory.js' );

var AST = require( './teya-ast.js' );
var asts = require( './teya-asts.js' );

var add_templates = require( './codegen.js' );

add_templates( asts, AST, 'js' );
add_templates( asts, AST, 'teya' );

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = new Factory( AST, asts );

//  ---------------------------------------------------------------------------------------------------------------  //

