var no = require( 'nommon' );

//  ---------------------------------------------------------------------------------------------------------------  //

var R = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var RX_AMP = /&/g;
var RX_LT = /</g;
var RX_GT = />/g;

var RX_TAGNAME = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

//  ---------------------------------------------------------------------------------------------------------------  //

var RX_AMP = /&/g;
var RX_LT = /</g;
var RX_GT = />/g;
var RX_QUOTE = /"/g;

var RX_E_AMP = /&amp;/g;
var RX_E_LT = /&lt;/g;
var RX_E_GT = /&gt;/g;
var RX_E_QUOTE = /&quot;/g;

function string_to_xml( s ) {
    if ( s == null ) {
        return '';
    }

    return ( '' + s )
        .replace( RX_AMP, '&amp;' )
        .replace( RX_LT, '&lt;' )
        .replace( RX_GT, '&gt;' );
}

function xml_to_string( s ) {
    if ( s == null ) {
        return '';
    }

    return ( '' + s )
        .replace( RX_E_LT, '<' )
        .replace( RX_E_GT, '>' )
        .replace( RX_E_AMP, '&' )
}

function string_to_attrvalue( s ) {
    if ( s == null ) {
        return '';
    }

    return ( '' + s )
        .replace( RX_AMP, '&amp;' )
        .replace( RX_LT, '&lt;' )
        .replace( RX_GT, '&gt;' )
        .replace( RX_QUOTE, '&quot;' );
}

function xml_to_attrvalue( s ) {
    if ( s == null ) {
        return '';
    }

    return ( '' + s )
        .replace( RX_AMP, '&amp;' )
        .replace( RX_LT, '&lt;' )
        .replace( RX_GT, '&gt;' )
        .replace( RX_QUOTE, '&quot;' );
}

R.string_to_attrvalue = string_to_attrvalue;
R.xml_to_attrvalue = xml_to_attrvalue;

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
    return (
        name === 'img' ||
        name === 'br' ||
        name === 'input' ||
        name === 'hr' ||
        name === 'link' ||
        name === 'meta' ||
        name === 'wbr' ||
        name === 'col' ||
        name === 'embed' ||
        name === 'param'
    )
}

R.is_empty_tag = is_empty_tag;

//  ---------------------------------------------------------------------------------------------------------------  //

function Attrs( tag, attrs ) {
    this._tag = tag;
    this._attrs = attrs || {};
}

Attrs.prototype.set_string = function( name, value ) {
    this._attrs[ name ] = string_attr( value );
};

Attrs.prototype.set_xml = function( name, value ) {
    this._attrs[ name ] = xml_attr( value );
};

Attrs.prototype.add_string = function( name, value ) {
    var attrs = this._attrs;

    var attr = attrs[ name ];
    if ( !attr ) {
        attrs[ name ] = string_attr( value );
    } else {
        attr.add_string( value );
    }
};

Attrs.prototype.add_xml = function( name, value ) {
    var attrs = this._attrs;

    var attr = attrs[ name ];
    if ( !attr ) {
        attrs[ name ] = xml_attr( value );
    } else {
        attr.add_xml( value );
    }
};

Attrs.prototype.copy = function( attrs ) {
    var src = attrs._attrs;
    var dest = this._attrs;

    for ( var name in src ) {
        dest[ name ] = src[ name ].clone();
    }
};

Attrs.prototype.close = function() {
    var tag = this._tag;
    if ( !tag ) {
        return '';
    }

    var attrs = this._attrs;
    var r = '';
    for ( var name in attrs ) {
        r += ' ' + name + '="' + attrs[ name ].value + '"';
    }
    r += ( is_empty_tag( tag ) ) ? '/>' : '>';

    this._tag = '';

    return r;
};

Attrs.prototype.merge = function( ca ) {
    var attrs = this._attrs;

    var set = ca._set;
    var added = ca._added;

    for ( var name in set ) {
        attrs[ name ] = set[ name ];
    }
    for ( var name in added ) {
        var attr = attrs[ name ];
        if ( attr ) {
            attr.value += added[ name ].value;
        } else {
            attrs[ name ] = added[ name ];
        }
    }
};

R.attrs = function( tag, attrs ) {
    return new Attrs( tag, attrs );
};

//  ---------------------------------------------------------------------------------------------------------------  //

function Attr( value ) {
    this.value = value;
}

Attr.prototype.add_string = function( value ) {
    this.value += string_to_attrvalue( value );
};

Attr.prototype.add_xml = function( value ) {
    this.value += xml_to_attrvalue( value );
};

Attr.prototype.clone = function() {
    return new Attr( this.value );
};

function string_attr( value ) {
    return new Attr( string_to_attrvalue( value ) );
};

function xml_attr( value ) {
    return new Attr( xml_to_attrvalue( value ) );
};

R.string_attr = string_attr;
R.xml_attr = xml_attr;

//  ---------------------------------------------------------------------------------------------------------------  //

function ContentAttrs() {
    this._set = {};
    this._added = {};
};

ContentAttrs.prototype.set_string = function( name, value ) {
    if ( !this._added[ name ] ) {
        delete this._added[ name ];
    }

    this._set[ name ] = string_attr( value );
};

ContentAttrs.prototype.set_xml = function( name, value ) {
    if ( !this._added[ name ] ) {
        delete this._added[ name ];
    }

    this._set[ name ] = xml_attr( value );
};

ContentAttrs.prototype.add_string = function( name, value ) {
    var attr = this._set[ name ] || this._added[ name ];
    if ( attr ) {
        attr.add_string( value );
    } else {
        this._added[ name ] = string_attr( value );
    }
};

ContentAttrs.prototype.add_xml = function( name, value ) {
    var attr = this._set[ name ] || this._added[ name ];
    if ( attr ) {
        attr.add_xml( value );
    } else {
        this._added[ name ] = xml_attr( value );
    }
};

R.content_attrs = function() {
    return new ContentAttrs();
};

//  ---------------------------------------------------------------------------------------------------------------  //

var I = R.internal_funcs = {};

//  FIXME: Это должно быть в библиотеке внешних функций. Для теста пока что.
I.slice = function( s, from, to ) {
    return s.slice( from, to );
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = R;

