var teya = require( './teya.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

teya.types = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var TYPE = teya.types;

var NONE = TYPE.NONE = '';
var UNDEF = TYPE.UNDEF = 'undef';
var ANY = TYPE.ANY = 'any';

var STRING = TYPE.STRING = 'string';
var NUMBER = TYPE.NUMBER = 'number';
var BOOLEAN = TYPE.BOOLEAN = 'boolean';
var OBJECT = TYPE.OBJECT = 'object';
var ARRAY = TYPE.ARRAY = 'array';
//  string, number, boolean, object, array or null.
var JSON = TYPE.JSON = 'json';

//  Object's content.
var PAIR = TYPE.PAIR = 'pair';
//  Array's content.
var ITEM = TYPE.ITEM = 'item';

var XML = TYPE.XML = 'xml';
var ATTR = TYPE.ATTR = 'attr';

var MODULE = TYPE.MODULE = 'module';

var MANY = TYPE.MANY = function( type ) {
    return '...' + type;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.types.common_type = function( left, right ) {
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

teya.types.join_types = function( left, right ) {
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

teya.types.is_castable = function( from, to ) {
    if ( from === to || to === ANY ) {
        return true;
    }

    if ( from === NONE ) {
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

