var gen_ctors = require( './ctors.js' );

var AST = require( './teya-ast.js' );
var asts = require( './teya-asts.js' );

var add_templates = require( './codegen.js' );

add_templates( asts, AST, 'js', 'templates/js.tmpl' );
add_templates( asts, AST, 'teya', 'templates/teya.tmpl' );

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = gen_ctors( AST, asts );

//  ---------------------------------------------------------------------------------------------------------------  //

