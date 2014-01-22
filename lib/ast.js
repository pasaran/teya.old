var fs_ = require( 'fs' );
var path_ = require( 'path' );

var no = require( 'nommon' );
require( 'no.colors' );

var Terror = require( './terror.js' );
var TYPE = require( './types.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var AST = function() {};

//  AST.prototype._init = no.nop;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.state = {
    tid: 0,
    vid: 0,
    fid: 0,
};

AST.prototype.child = function( id, params ) {
    var ast = this.create( id, params );

    ast.parent = this;

    //  ast.rid = this.rid;
    //  ast.cid = this.cid;

    //  ast.w_set_scope();

    return ast;
};

AST.prototype.error = function( error ) {
    Terror.throw( error, this.pos );
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.w_def = no.nop;
AST.prototype.w_action = no.nop;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.get_type = function() {
    var type = this.__get_type;

    if ( !type ) {
        type = this.__get_type = this._get_type();
    }

    return type;
};

AST.prototype._get_type = function() {
    return TYPE.NONE;
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.apply = function( callback, params ) {
    callback( this, params );
};

AST.prototype.dowalk = function( callback, params ) {
    callback( this, params );
};

AST.prototype.walkdo = function( callback, params ) {
    callback( this, params );
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.is = function( id ) {
    return ( this instanceof this.ctors[ id ] );
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
        var s = this.id;
        var type = this.get_type();
        if ( type !== TYPE.NONE ) {
            s += ': ' + type.teal;
        }
        s += '\n';
        s += r.join( '\n' ).replace( /^/gm, '    ' );
        //  var s = this.id + ': ' + this.get_type().teal + '\n' + r.join('\n').replace(/^/gm, '    ');

        return s;
    } else {
        return this.id;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = AST;

//  ---------------------------------------------------------------------------------------------------------------  //

