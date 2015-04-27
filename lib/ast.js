var no = require( 'nommon' );

require( 'no.colors' );

//  ---------------------------------------------------------------------------------------------------------------  //

var teya = require( './teya.js' );
require( './terror.js' );
require( './types.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var types = teya.types;
var TYPE = teya.types;

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST = function() {};

teya.AST.prototype._init = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.get_type = function() {
    var type = this.__get_type;

    if ( !type ) {
        type = this.__get_type = this._get_type();
    }

    return type;
};

teya.AST.prototype.get_cast_type = function() {
    return this.to_type || this.get_type();
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.apply = function( callback, params ) {
    callback( this, params );
};

teya.AST.prototype.dowalk = function( callback, params ) {
    callback( this, params );
};

teya.AST.prototype.walkdo = function( callback, params ) {
    callback( this, params );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.is = function( id ) {
    return this.factory.is( this, id );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.toString = function() {
    return this.to_string( true );
};

teya.AST.prototype.to_string = function() {
    var r = this.string_id();
    var s = this.string_children();

    return ( s ) ? r + '\n' + s : r;
};

teya.AST.prototype.string_id = function() {
    var r = this.id;

    var type = this.from_type || this.get_type();
    if ( type ) {
        r += ': ' + type.teal;
    }
    if ( this.to_type && this.to_type !== this.from_type ) {
        r += ( ' -> ' + this.to_type ).teal;
    }

    if ( this.rid ) {
        r += ( ' rid=' + this.rid ).teal;
    }
    if ( this.xid ) {
        r += ( ' xid=' + this.xid ).teal;
    }

    return r;
};

teya.AST.prototype.string_children = function() {
    var r = [];

    var props = this.options.props || [];
    for ( var i = 0, l = props.length; i < l; i++ ) {
        var key = props[ i ];
        var value = this[ key ];

        if ( value != null ) {
            if ( value instanceof teya.AST ) {
                var s = value.to_string();
                if ( s ) {
                    r.push( ( key + ': ' ).blue + s );
                }

            } else {
                r.push( ( key + ': ' ).blue + JSON.stringify( value ).lime );
            }
        }

    };

    return ( r.length ) ? r.join( '\n' ).replace( /^/gm, '    ' ) : '';
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.state = {
    tid: 0,
    vid: 0,
    fid: 0,
    cid: 0,
    iid: 0,
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.xid = 0;
teya.AST.prototype.aid = 0;
teya.AST.prototype.rid = 0;
teya.AST.prototype.nid = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.w_def = no.op;
teya.AST.prototype.w_action = no.op;
teya.AST.prototype.w_validate = no.op;
teya.AST.prototype.w_prepare = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype._get_type = function() {
    return TYPE.NONE;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.cast = function( to ) {
    var from = this.get_type();

    /*
    if ( from === TYPE.NONE ) {
        return;
    }
    */

    to = to || from;
    //  console.log( 'CAST', this.id, from, to );

    if ( !types.is_castable( from, to ) ) {
        this.error( 'CAST_ERROR', {
            from: from,
            to: to
        } );
    }

    if ( from !== to ) {
        this.from_type = from;
        this.to_type = to;
    }

    this.oncast( to );
};

teya.AST.prototype.oncast = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.is_inline = no.false;
teya.AST.prototype.is_const = no.false;

//  Метод, который говорит, может ли ast начинаться с атрибута.
//  Например, содержимое тега `<div>` в следующих примерах:
//
//      <div class="hello">
//          //  Точно не начинается с атрибута. Возвращаем `false`.
//          "Hello"
//
//      <div class="hello">
//          //  Точно начинается с атрибута. Возвращаем `true`.
//          @id = "id"
//          "Hello"
//
//      <div class="hello">
//          //  Неизвестно. Возвращаем undefined.
//          ...
//
//  Если мы точно знаем, что атрибутов нет (`false`), то можем выводить предшествующий тег
//  сразу со всеми атрибутами:
//
//      r0 += '<div class="hello">';
//      r0 += 'Hello';
//
//  Иначе нужно сохранять атрибуты в отдельный объект, так что их можно было бы ниже изменить:
//
//      r0 += '<div';
//      a0 = {
//          tag: 'div',
//          attrs: {
//              class: 'hello'
//          }
//      };
//      a0[ 'id' ] = 'id';
//      r0 += close_attrs( a0 );
//      r0 += 'Hello';
//
teya.AST.prototype.starts_with_attr = function() {
    this.error( 'METHOD_NOT_IMPLEMENTED', {
        method: 'starts_with_attr',
        id: this.id
    } );
};

//  Метод, который определяет, "закрывает" ли это выражение атрибуты
//  (т.е. после "закрывающего" выражения все конструкции вида `@foo = ...` и другие выражение с типом attr
//  должны игнорироваться, а в поток нужно вывести остатки открывающего тега -- `' class="foo">'`
//  в данном случае).
//
//      <div>
//          @class = "foo"
//          //  Здесь if "закрывает" атрибуты т.к. при любых условиях, его значение будет скалярным.
//          if .foo
//              "Hello"
//          else
//              "Bye"
//          //  Это выражение бесполезно.
//          @data = 42
//
//      <div>
//          @class = "foo"
//          //  Здесь значение метода будет `undefined`. Мы не можем с уверенностью сказать ни да, ни нет.
//          //  Потому что только вторая ветка "закрывает" атрибуты.
//          if .foo
//              @id = "bar"
//          else
//              "Hello"
//          //  Это выражение может повлиять на результат, если `.foo` истинно.
//          @data = 42
//
//      <div>
//          @class = "foo"
//          //  Здесь значение будет (как и в первом примере) `true`.
//          //  Хотя каждая ветка и не начинается со строки, но в каждой ветке присутствует строка.
//          if .foo
//              @id = "bar"
//              "Hello"
//          else
//              @id = "quu"
//              "Bye"
//          //  Это выражение опять таки бесполезно, так как в любом случае `if` "закрывает" атрибуты.
//          @data = 42
//
//      <div>
//          @class = "foo"
//          //  Здесь значение будет `false`, так как тип `if` будет `attr`.
//          if .foo
//              @id = "bar"
//          else
//              @id = "quu"
//          @data = 42
//
//  Возможные значения:
//
//      true        -- "закрывает" точно (например, string).
//      false       -- не "закрывает" точно (например, attr).
//      undefined   -- неизвестно, может так, а может так (например, xml).
//
teya.AST.prototype.closes_attrs = function() {
    this.error( 'METHOD_NOT_IMPLEMENTED', {
        method: 'closes_attrs',
        id: this.id
    } );
};

//  Инициирует процесс расстановки `close_attrs` в блоках.
//
teya.AST.prototype.close_attrs = function( is_open ) {
    this.error( 'METHOD_NOT_IMPLEMENTED', {
        method: 'close_attrs',
        id: this.id
    } );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.ast = function( id, params ) {
    return this.factory.ast( id, this.pos, params );
};

teya.AST.prototype.child = function( id, params ) {
    var ast = this.ast( id, params );

    ast.parent = this;
    ast.scope = this.scope;

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.AST.prototype.error = function( id, params ) {
    throw new teya.Terror( id, params, this.pos );
};

//  ---------------------------------------------------------------------------------------------------------------  //

