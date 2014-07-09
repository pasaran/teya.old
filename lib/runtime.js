var R = {};

var RX_AMP = /&/g;
var RX_LT = /</g;
var RX_GT = />/g;

R.to_array = function( data ) {
    return ( Array.isArray( data ) ) ? data : [];
};

R.to_string = function( data ) {
    if ( data == null || typeof data === 'object' ) {
        return '';
    }

    return '' + data;
};

R.to_number = function( data ) {
    if ( data == null || typeof data === 'object' ) {
        return 0;
    }

    return +data;
};

R.to_xml = function( data ) {
    if ( data == null || typeof data === 'object' ) {
        return '';
    }

    return ( '' + data )
        .replace( RX_AMP, '&amp;' )
        .replace( RX_LT, '&lt;' )
        .replace( RX_GT, '&gt;' );
};

var RX_TAGNAME = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

R.to_tagname = function( data ) {
    if ( !data || typeof data !== 'string' || !RX_TAGNAME.test( data ) ) {
        return 'div';
    }

    return data;
};

//  ---------------------------------------------------------------------------------------------------------------  //

function Attrs( tag, attrs ) {
    this.tag = tag;
    this.attrs = attrs || {};
}

Attrs.prototype.set = function( key, value ) {
    this.attrs[ key ] = value;
};

Attrs.prototype.add = function( key, value ) {
    var attrs = this.attrs;

    attrs[ key ] = ( attrs[ key] || '' ) + value;
};

Attrs.prototype.copy = function( attrs ) {
    var _attrs = this.attrs;

    for ( var key in attrs ) {
        _attrs[ key ] = attrs[ key ];
    }
};

Attrs.prototype.close = function() {
    var tag = this.tag;
    if ( !tag ) {
        return '';
    }

    var attrs = this.attrs;
    var r = '';
    for ( var key in attrs ) {
        //  FIXME: Тут нужен какой-то эскейпинг.
        r += ' ' + key + '="' + attrs[ key ] + '"';
    }
    r += '>';

    this.tag = '';

    return r;
};

R.attrs = function( tag, attrs ) {
    return new Attrs( tag, attrs );
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = R;

