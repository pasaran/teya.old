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

module.exports = R;

