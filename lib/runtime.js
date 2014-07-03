var R = {};

var RX_AMP = /&/g;
var RX_LT = /</g;
var RX_GT = />/g;

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

R.close_attrs = function( a0 ) {
    var tag = a0.tag;
    if ( !tag ) {
        return '';
    }

    var attrs = a0.attrs;
    var r0 = '';
    for ( var name in attrs ) {
        r0 += ' ' + name + '="' + attrs[ name ] + '"';
    }
    r0 += '>';

    a0.tag = '';

    return r0;
};

module.exports = R;

