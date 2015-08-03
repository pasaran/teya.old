var runtime = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_indent = /^/gm;

runtime.indent = function( str, indent ) {
    if ( str ) {
        str = str.replace( rx_indent, indent );
    }

    return str;
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = runtime;

