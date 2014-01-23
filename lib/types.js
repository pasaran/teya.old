var types = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var NONE = types.NONE = '';
var UNDEF = types.UNDEF = 'undef';
var ANY = types.ANY = 'any';
var SCALAR = types.SCALAR = 'scalar';
var BOOL = types.BOOL = 'bool';
var XML = types.XML = 'xml';
var ATTR = types.ATTR = 'attr';
var ATTRVALUE = types.ATTRVALUE = 'attrvalue';
var OBJECT = types.OBJECT = 'object';
var PAIR = types.PAIR = 'pair';
var ARRAY = types.ARRAY = 'array';
var ITEM = types.ITEM = 'item';
var JSON = types.JSON = 'json';

//  ---------------------------------------------------------------------------------------------------------------  //

types.common_type = function( left, right ) {
    if (left === right) { return left; }

    //  FIXME: Не очень понятно, нужно ли это.
    if ( left === UNDEF ) { return right; }
    if ( right === UNDEF ) { return left; }

    if ( left === ARRAY || right === ARRAY ) { return UNDEF; }
    if ( left === OBJECT || right === OBJECT ) { return UNDEF; }
    if ( left === PAIR || right === PAIR ) { return UNDEF; }

    if ( left === BOOL || right === BOOL ) { return BOOL; }

    if ( left === XML || right === XML ) { return XML; }
    if ( left === ATTR || right === ATTR ) { return XML; }

    return SCALAR;
};

//  ---------------------------------------------------------------------------------------------------------------  //

types.join_types = function( left, right ) {
    //  UNDEF + ??? === UNDEF
    if ( left === UNDEF || right === UNDEF ) { return UNDEF; }

    //  ARRAY + ??? === UNDEF
    if ( left === ARRAY || right === ARRAY ) { return UNDEF; }
    //  OBJECT + ??? === UNDEF
    if ( left === OBJECT || right === OBJECT ) { return UNDEF; }
    //  BOOLEAN + ??? === UNDEF
    if ( left === BOOL || right === BOOL ) { return UNDEF; }

    //  PAIR + ??? === PAIR
    if ( left === PAIR || right === PAIR ) { return PAIR; }

    //  ATTR + ATTR === ATTR
    if ( left === ATTR && right === ATTR ) { return ATTR; }
    //  ATTR + ??? === XML
    if ( left === ATTR || right === ATTR ) { return XML; }

    //  XML + ??? === XML.
    if ( left === XML || right === XML ) { return XML; }

    //  ITEM + ITEM === ITEM
    if ( left === ITEM && right === ITEM ) { return ITEM; }

    //  Все остальное это SCALAR.
    return SCALAR;
};

//  ---------------------------------------------------------------------------------------------------------------  //

types.is_castable = function( from, to ) {
    return (
        ( from === to) ||

        ( to === ANY ) ||

        ( from === JSON && to === SCALAR ) ||
        ( from === JSON && to === XML ) ||
        ( from === JSON && to === ATTRVALUE ) ||
        ( from === JSON && to === BOOL ) ||

        ( from === SCALAR && to === BOOL ) ||
        ( from === SCALAR && to === XML ) ||
        ( from === SCALAR && to === ATTRVALUE ) ||

        ( from === XML && to === SCALAR ) ||
        ( from === XML && to === BOOL ) ||
        ( from === XML && to === ATTRVALUE ) ||

        ( from === ATTR && to === XML ) ||

        ( from === OBJECT && to === JSON ) ||
        ( from === ARRAY && to === JSON )
    );
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = types;

//  ---------------------------------------------------------------------------------------------------------------  //

