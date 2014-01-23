var no = require( 'nommon' );
require( 'no.colors' );

var Terror = require( './terror.js' );
var TYPE = require( './types.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var AST = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.error = function( error ) {
    Terror.throw( error, this.pos );
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.get_type = function() {
    var type = this.__get_type;

    if ( !type ) {
        type = this.__get_type = this._get_type();
    }

    return type;
};

AST.prototype.req_type = function( req_type ) {
    var type = this.get_type();

    if ( type !== req_type ) {
        this.error( {
            id: 'WRONG_TYPE',
            type: req_type,
            msg: 'Invalid type. Should be ' + JSON.stringify( req_type ) + '. Found ' + JSON.stringify( type )
        } );
    }
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

AST.prototype.toString = function() {
    return this.to_string( true );
};

AST.prototype.to_string = function( with_type ) {
    var r = this.string_id( with_type );
    var s = this.string_children( with_type );

    return ( s ) ? r + '\n' + s : r;
};

AST.prototype.string_id = function( with_type ) {
    var r = this.id;

    if ( with_type ) {
        var type = this.get_type();
        if ( type !== TYPE.NONE ) {
            r += ': ' + type.teal;
        }
    }

    return r;
};

AST.prototype.string_children = function( with_type ) {
    var r = [];

    var props = this.options.props || [];
    for ( var i = 0, l = props.length; i < l; i++ ) {
        var key = props[ i ];
        var value = this[ key ];

        if ( value != null ) {
            if ( value instanceof AST ) {
                var s = value.to_string( with_type );
                if ( s ) {
                    r.push( ( key + ': ' ).blue + s );
                }

            } else {
                r.push( ( key + ': ' ).blue + JSON.stringify( value ).lime );
            }
        }

    };

    return ( r.length ) ? r.join( '\n' ).replace( /^/gm, '    ' ) : '';
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = AST;

//  ---------------------------------------------------------------------------------------------------------------  //

