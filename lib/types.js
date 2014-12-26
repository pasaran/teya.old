var teya = require( './teya.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

teya.types = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var TYPE = teya.types;

[
    'none',
    'undef',
    'any',

    'null',
    'string',
    'number',
    'boolean',
    'object',
    'array',
    'json',

    'pair',
    'item',

    'xml',
    'attr',

    'module',

].forEach(
    function( type ) {
        TYPE[ type.toUpperCase() ] = type;
    }
);

//  ---------------------------------------------------------------------------------------------------------------  //

TYPE.MANY = function( type ) {
    return '...' + type;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.types.common_type = function( left, right ) {
    if (left === right) { return left; }

    //  FIXME: Не очень понятно, нужно ли это.
    if ( left === TYPE.UNDEF ) { return right; }
    if ( right === TYPE.UNDEF ) { return left; }

    if ( left === TYPE.ARRAY || right === TYPE.ARRAY ) { return TYPE.UNDEF; }
    if ( left === TYPE.OBJECT || right === TYPE.OBJECT ) { return TYPE.UNDEF; }
    if ( left === TYPE.PAIR || right === TYPE.PAIR ) { return TYPE.UNDEF; }

    if ( left === TYPE.BOOLEAN || right === TYPE.BOOLEAN ) { return TYPE.BOOLEAN; }

    if ( left === TYPE.XML || right === TYPE.XML ) { return TYPE.XML; }
    if ( left === TYPE.ATTR || right === TYPE.ATTR ) { return TYPE.XML; }

    return TYPE.STRING;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.types.join_types = function( left, right ) {
    if ( left === TYPE.UNDEF || right === TYPE.UNDEF ) { return TYPE.UNDEF; }

    if ( left === TYPE.ARRAY || right === TYPE.ARRAY ) { return TYPE.UNDEF; }
    if ( left === TYPE.OBJECT || right === TYPE.OBJECT ) { return TYPE.UNDEF; }
    if ( left === TYPE.BOOLEAN || right === TYPE.BOOLEAN ) { return TYPE.UNDEF; }

    if ( left === TYPE.PAIR || right === TYPE.PAIR ) { return TYPE.PAIR; }

    if ( left === TYPE.ATTR && right === TYPE.ATTR ) { return TYPE.ATTR; }
    if ( left === TYPE.ATTR || right === TYPE.ATTR ) { return TYPE.XML; }

    if ( left === TYPE.XML || right === TYPE.XML ) { return TYPE.XML; }

    if ( left === TYPE.ITEM && right === TYPE.ITEM ) { return TYPE.ITEM; }

    //  Все остальное это TYPE.STRING.
    //  FIXME: Лучше просто ошибку тут кидать.
    //  Или возвращать TYPE.UNDEF, так как непонятно, от кого кидать ошибку.
    return TYPE.STRING;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.types.is_castable = function( from, to ) {
    if ( from === to || to === TYPE.ANY ) {
        return true;
    }

    /*
    //  FIXME: Откуда это взялось вообще?
    //  close_attrs сделал с типом xml и вроде не нужно.
    if ( from === TYPE.NONE ) {
        return true;
    }
    */

    if ( from === TYPE.JSON ) {
        return (
            to === TYPE.STRING ||
            to === TYPE.NUMBER ||
            to === TYPE.XML ||
            to === TYPE.BOOLEAN
        );
    }

    if ( from === TYPE.STRING ) {
        return (
            to === TYPE.BOOLEAN ||
            to === TYPE.XML
        );
    }

    if ( from === TYPE.NUMBER ) {
        return (
            to === TYPE.STRING ||
            to === TYPE.BOOLEAN ||
            to === TYPE.XML
        );
    }

    if ( from === TYPE.XML ) {
        return (
            to === TYPE.STRING ||
            to === TYPE.BOOLEAN
        );
    }

    if ( from === TYPE.ATTR ) {
        return (
            to === TYPE.XML
        );
    }

    if ( from === TYPE.OBJECT ) {
        return (
            to === TYPE.JSON
        );
    }

    if ( from === TYPE.ARRAY ) {
        return (
            to === TYPE.JSON
        );
    }

    return false;
};

//  ---------------------------------------------------------------------------------------------------------------  //

