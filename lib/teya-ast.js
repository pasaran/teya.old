var no = require( 'nommon' );

var BaseAST = require( './ast.js' );
var types = require( './teya-types.js' );
var TYPE = types;

//  ---------------------------------------------------------------------------------------------------------------  //

var AST = function() {};

no.inherit( AST, BaseAST );

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.state = {
    tid: 0,
    vid: 0,
    fid: 0,
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.cid = 0;
AST.prototype.rid = 0;
AST.prototype.nid = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.w_def = no.op;
AST.prototype.w_action = no.op;
AST.prototype.w_prepare = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype._get_type = function() {
    return TYPE.NONE;
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.cast = function( to ) {
    var from = this.get_type();
    to = to || from;
    //  console.log( 'CAST', this.id, from, to );

    if ( !types.is_castable( from, to ) ) {
        this.error( {
            id: 'CAST_ERROR',
            from: from,
            to: to,
            msg: 'Cannot convert from ' + JSON.stringify( from ) + ' to ' + JSON.stringify( to )
            //  FIXME:
            //  msg: 'Cannot convert from "%from" to "%to"'
        } );
    }

    if ( from !== to ) {
        this.from_type = from;
        this.to_type = to;
    }

    this.oncast( to );
};

AST.prototype.oncast = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.is_inline = no.false;
AST.prototype.is_const = no.false;

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
AST.prototype.starts_with_attr = function() {
    if ( this.get_type() === TYPE.SCALAR ) {
        return false;
    }

    //  Во всех остальных случаях мы ничего гарантировать не можем.
    //  Поэтому возвращаем `undefined`.
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = AST;

//  ---------------------------------------------------------------------------------------------------------------  //

