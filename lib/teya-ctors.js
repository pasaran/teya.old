var gen_ctors = require( './ctors.js' );

var AST = require( './ast.js' );
var asts = require( './teya-asts.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = gen_ctors( AST, asts );

//  ---------------------------------------------------------------------------------------------------------------  //
