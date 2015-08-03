var runtime = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_indent = /^(?=\S)/gm;

runtime.indent = function( str, indent ) {
    return ( str ) ? str.replace( rx_indent, indent ) : '';
};

runtime.line = function( str ) {
    return ( str ) ? str + '\n' : '';
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = runtime;

