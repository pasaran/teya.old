var fs_ = require( 'fs' );
var path_ = require( 'path' );

var Parser = require( './parser.js' );
var grammar = require( './grammar.js' );
var factory = require( './factory.js' );
var Scope = require( './scope.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var teya = {};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.parse = function( filename ) {
    var parser = new Parser( grammar, factory );
    parser.load_file( filename );

    var ast = parser.match( 'module' );

    return ast;
};

teya.walk = function( ast ) {
    //  Проставляем root, parent и scope.
    ast.root = ast;
    ast.scope = new Scope();
    ast.dowalk( function( ast, params, pkey, pvalue ) {
        var parent = ast.parent = pvalue || null;

        if ( parent ) {
            ast.root = parent.root;
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
    } );

    ast.dowalk( function( ast ) {
        var parent = ast.parent;
        if ( parent ) {
            if ( ast.xid === null ) { ast.xid = 0; } else { ast.xid += parent.xid; }
            if ( ast.rid === null ) { ast.rid = 0; } else { ast.rid += parent.rid; }
            if ( ast.nid === null ) { ast.nid = 0; } else { ast.nid += parent.nid; }
        }
    } );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.compile = function( filename ) {
    var ast = teya.parse( filename );
    ast = teya.walk( ast );

    var out = ast.js( '' );

    return out;
};

teya.compile_to_file = function( filename ) {
    var out = teya.compile( filename );

    fs_.writeFileSync( filename + '.js', out, 'utf-8' );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.run = function( filename, template_id, data ) {
    if ( typeof data === 'string' ) {
        if ( data.charAt( 0 ) === '{' || data.charAt( 0 ) === '[' ) {
            data = eval( '(' + data + ')' );

        } else if ( /\.(json|data)$/.test( data ) ) {
            if ( fs_.existsSync( data ) ) {
                var content = fs_.readFileSync( data, 'utf-8' );
                data = eval( '(' + content + ')' );
            }
        }
    }

    data = data || {};

    teya.compile_to_file( filename );

    var m = require( path_.resolve( filename ) + '.js' );

    return m( data, template_id );
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = teya;

//  ---------------------------------------------------------------------------------------------------------------  //

