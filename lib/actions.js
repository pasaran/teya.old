var fs_ = require( 'fs' );
var path_ = require( 'path' );

//  ---------------------------------------------------------------------------------------------------------------  //

var teya = require( './teya.js' );
require( './parser.js' );
require( './scope.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var _parsed = {};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.parse = function( filename ) {
    var ast = _parsed[ filename ];
    if ( ast ) {
        return ast;
    }

    var parser = new teya.Parser();

    ast = parser.parse( filename );

    //  Проставляем root, parent и scope.
    ast.root = ast;
    ast.scope = new teya.Scope();
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

    ast.dowalk( function( ast ) {
        ast.w_validate();
    } );

    ast.dowalk( function( ast ) {
        ast.w_prepare();
    } );

    ast.dowalk( function( ast ) {
        var parent = ast.parent;
        if ( parent ) {
            ast.xid += parent.xid;
            ast.rid += parent.rid;
            ast.aid += parent.aid;
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

    return m.run( data, template_id );
};

//  ---------------------------------------------------------------------------------------------------------------  //

