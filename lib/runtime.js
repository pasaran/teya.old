var R = {};

var RX_AMP = /&/g;
var RX_LT = /</g;

R.to_string = function( data ) {
    if ( data == null || typeof data === 'object' ) {
        return '';
    }

    return '' + data;
};

R.string_to_xml = function( data ) {
    if ( data == null ) {
        return '';
    }

    return ( '' + data )
        .replace( RX_AMP, '&amp;' )
        .replace( RX_LT, '&lt;' );
};

module.exports = R;

