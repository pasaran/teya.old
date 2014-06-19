var gen_ctors = require( './ctors.js' );

var AST = require( './teya-ast.js' );
var asts = require( './teya-asts.js' );

var add_templates = require( './codegen.js' );

add_templates( asts, AST, 'js' );
add_templates( asts, AST, 'teya' );

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = gen_ctors( AST, asts );

//  ---------------------------------------------------------------------------------------------------------------  //

