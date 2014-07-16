var no = require( 'nommon' );

//  ---------------------------------------------------------------------------------------------------------------  //

var R = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var RX_AMP = /&/g;
var RX_LT = /</g;
var RX_GT = />/g;

var RX_TAGNAME = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

var empty_tags = {
    br: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    link: true,
    meta: true,
    param: true,
    wbr: true
};

//  ---------------------------------------------------------------------------------------------------------------  //

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

R.to_tagname = function( data ) {
    if ( !data || typeof data !== 'string' || !RX_TAGNAME.test( data ) ) {
        return 'div';
    }

    return data;
};

//  ---------------------------------------------------------------------------------------------------------------  //

function is_empty_tag( name ) {
    return empty_tags[ name ];
}

R.is_empty_tag = is_empty_tag;

//  ---------------------------------------------------------------------------------------------------------------  //

function Attrs( tag, attrs ) {
    this._tag = tag;
    this._attrs = attrs || {};
}

Attrs.prototype.set = function( name, value ) {
    this._attrs[ name ] = value;
};

Attrs.prototype.add = function( name, value ) {
    var attrs = this._attrs;

    attrs[ name ] = ( attrs[ name ] || '' ) + value;
};

Attrs.prototype.copy = function( attrs ) {
    no.extend( this._attrs, attrs._attrs );
};

Attrs.prototype.close = function() {
    var tag = this._tag;
    if ( !tag ) {
        return '';
    }

    var attrs = this._attrs;
    var r = '';
    for ( var name in attrs ) {
        //  FIXME: Тут нужен какой-то эскейпинг.
        r += ' ' + name + '="' + attrs[ name ] + '"';
    }
    r += ( is_empty_tag( tag ) ) ? '/>' : '>';

    this._tag = '';

    return r;
};

/*
Attrs.prototype.merge = function( ca ) {
    var attrs = this._attrs;

    var set = ca._set;
    var added = ca._added;

    for ( var name in set ) {
        attrs[ name ] = set[ name ];
    }
    for ( var name in added ) {
        attrs[ name ] = ( attrs[ name ] || '' ) + added[ name ];
    }
};
*/

R.attrs = function( tag, attrs ) {
    return new Attrs( tag, attrs );
};

//  ---------------------------------------------------------------------------------------------------------------  //

/*
function ContentAttrs() {
    this._set = {};
    this._added = {};
};

ContentAttrs.prototype.set = function( name, value ) {
    if ( this._added[ name ] != null ) {
        //  FIXME: Может лучше за-null-ять?
        delete this._added[ name ];
    }

    this._set[ name ] = value;
};

ContentAttrs.prototype.add = function( name, value ) {
    if ( this._set[ name ] != null ) {
        this._set[ name ] += value;
    } else {
        this._added[ name ] = ( this._added[ name ] || '' ) + value;
    }
};

R.content_attrs = function() {
    return new ContentAttrs();
};
*/

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = R;

