var fs_ = require( 'fs' );
var path_ = require( 'path' );

var no = require( 'nommon' );
require( 'no.colors' );

var terror = require( './terror.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var AST = function() {};

//  AST.prototype._init = no.nop;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.error = function( id, msg ) {
    terror( id, msg, this.pos );
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.child = function( id, params ) {
    var ast = this.create( id, params );

    ast.parent = this;

    //  ast.rid = this.rid;
    //  ast.cid = this.cid;

    //  ast.w_set_scope();

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.apply = no.nop;

AST.prototype.dowalk = function( callback, params ) {
    callback( this, params );
};

AST.prototype.walkdo = function( callback, params ) {
    callback( this, params );
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.is = function() {
    for ( var i = 0, l = arguments.length; i < l; i++ ) {
        var id = arguments[ i ];
        if ( this instanceof this.ctors[ id ] ) {
            return true;
        }
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  FIXME: Нужно генерить это в parser.js.
//
AST.prototype.toString = function() {
    var props = this.options.props || [];

    var r = [];

    for (var i = 0, l = props.length; i < l; i++) {
        var key = props[ i ];

        var child = this[ key ];
        if ( child != null ) {
            if ( child instanceof AST ) {
                var s = child.toString();
                if ( s ) {
                    r.push( ( key + ': ' ).blue + s );
                }
            } else {
                r.push( ( key + ': ' ).blue + JSON.stringify( child ).lime );
            }
        }
    }

    if ( r.length ) {
        /*
        var s = this.id.bold + '( ' + this.get_type().lime;
        if (this.as_type) {
            s += ' -> '.lime + this.as_type.lime;
        }
        s += ' )\n' + r.join('\n').replace(/^/gm, '    ');
       */
        var s = this.id + '\n' + r.join( '\n' ).replace( /^/gm, '    ' );
        //  var s = this.id + ': ' + this.get_type().teal + '\n' + r.join('\n').replace(/^/gm, '    ');

        return s;
    }

    return '';
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = AST;

//  ---------------------------------------------------------------------------------------------------------------  //

