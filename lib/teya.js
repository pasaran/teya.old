var fs_ = require( 'fs' );
var path_ = require( 'path' );

var Parser = require( './teya-parser.js' );
var grammar = require( './teya-grammar.js' );
var ctors = require( './teya-ctors.js' );
var Scope = require( './teya-scope.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var teya = {};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.parse = function( filename ) {
    var parser = new Parser( grammar, ctors );
    parser.load_file( filename );

    var ast = parser.match( 'module' );

    //  Проставляем parent'ы и scope'ы.
    ast.scope = new Scope();
    ast.dowalk( function( ast, params, pkey, pvalue ) {
        var parent = ast.parent = pvalue || null;

        if ( parent ) {
            ast.scope = ( ast.options.scope ) ? parent.scope.create() : parent.scope;
        }
    } );

    ast.dowalk( function( ast ) {
        ast.w_def();
    } );

    ast.walkdo( function( ast ) {
        ast.w_action();
    } );

    /*
    ast.dowalk( function( ast ) {
        ast.w_validate();
    } );
    */

    ast.dowalk( function( ast ) {
        ast.w_prepare();

        var parent = ast.parent;
        if ( parent ) {
            ast.rid += parent.rid;
            ast.cid += parent.cid;
            ast.nid += parent.nid;
        }
    } );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.compile = function( filename ) {
    var ast = teya.parse( filename );

    var out = ast.js( '' );

    return out;
};

teya.compile_to_file = function( filename ) {
    var out = teya.compile( filename );

    fs_.writeFileSync( filename + '.js', out, 'utf-8' );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.run = function( filename, data, template_id ) {
    teya.compile( filename );

    var m = require( path_.resolve( filename ) + '.js' );

    return m( data, template_id );
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = teya;

//  ---------------------------------------------------------------------------------------------------------------  //

