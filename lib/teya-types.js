var types = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var NONE = types.NONE = '';
var UNDEF = types.UNDEF = 'undef';
var ANY = types.ANY = 'any';

var STRING = types.STRING = 'string';
var NUMBER = types.NUMBER = 'number';
var BOOLEAN = types.BOOLEAN = 'boolean';
var OBJECT = types.OBJECT = 'object';
var ARRAY = types.ARRAY = 'array';
var NULL = types.NULL = 'null';

//  string, number, boolean, object, array or null.
var JSON = types.JSON = 'json';

//  Object's content.
var PAIR = types.PAIR = 'pair';
//  Array's content.
var ITEM = types.ITEM = 'item';

var XML = types.XML = 'xml';
var ATTR = types.ATTR = 'attr';
//  FIXME: А это нужно?
//  var ATTRVALUE = types.ATTRVALUE = 'attrvalue';

//  ---------------------------------------------------------------------------------------------------------------  //

types.common_type = function( left, right ) {
    if (left === right) { return left; }

    //  FIXME: Не очень понятно, нужно ли это.
    if ( left === UNDEF ) { return right; }
    if ( right === UNDEF ) { return left; }

    if ( left === ARRAY || right === ARRAY ) { return UNDEF; }
    if ( left === OBJECT || right === OBJECT ) { return UNDEF; }
    if ( left === PAIR || right === PAIR ) { return UNDEF; }

    if ( left === BOOLEAN || right === BOOLEAN ) { return BOOLEAN; }

    if ( left === XML || right === XML ) { return XML; }
    if ( left === ATTR || right === ATTR ) { return XML; }

    return STRING;
};

//  ---------------------------------------------------------------------------------------------------------------  //

types.join_types = function( left, right ) {
    //  UNDEF + ??? === UNDEF
    if ( left === UNDEF || right === UNDEF ) { return UNDEF; }

    //  ARRAY + ??? === UNDEF
    if ( left === ARRAY || right === ARRAY ) { return UNDEF; }
    //  OBJECT + ??? === UNDEF
    if ( left === OBJECT || right === OBJECT ) { return UNDEF; }
    //  BOOLEANEAN + ??? === UNDEF
    if ( left === BOOLEAN || right === BOOLEAN ) { return UNDEF; }

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

    //  Все остальное это STRING.
    return STRING;
};

//  ---------------------------------------------------------------------------------------------------------------  //

types.is_castable = function( from, to ) {
    if ( from === to || to === ANY ) {
        return true;
    }

    if ( from === JSON ) {
        return (
            to === STRING ||
            to === NUMBER ||
            to === XML ||
            to === BOOLEAN
        );
    }

    if ( from === STRING ) {
        return (
            to === BOOLEAN ||
            to === XML
        );
    }

    if ( from === NUMBER ) {
        return (
            to === STRING ||
            to === BOOLEAN ||
            to === XML
        );
    }

    if ( from === XML ) {
        return (
            to === STRING ||
            to === BOOLEAN
        );
    }

    if ( from === ATTR ) {
        return (
            to === XML
        );
    }

    if ( from === OBJECT ) {
        return (
            to === JSON
        );
    }

    if ( from === ARRAY ) {
        return (
            to === JSON
        );
    }

    return false;
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = types;

//  ---------------------------------------------------------------------------------------------------------------  //

