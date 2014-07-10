var no = require( 'nommon' );
require( 'no.colors' );

//  ---------------------------------------------------------------------------------------------------------------  //

var AST = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.get_type = function() {
    /*
    //  FIXME
    if ( this.to_type ) {
        return this.to_type;
    }
    */

    var type = this.__get_type;

    if ( !type ) {
        type = this.__get_type = this._get_type();
    }

    return type;
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
    return this.factory.is( this, id );
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
        var type = this.from_type || this.get_type();
        if ( type ) {
            r += ': ' + type.teal;
        }
        if ( this.to_type && this.to_type !== this.from_type ) {
            r += ( ' -> ' + this.to_type ).teal;
        }

        if ( this.rid ) {
            r += ( ' rid=' + this.rid ).teal;
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

