var no = require( 'nommon' );

var BaseParser = require( './parser.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var EOF = '\0';

//  ---------------------------------------------------------------------------------------------------------------  //

var Parser = function( grammar, ctors ) {
    this._init( grammar, ctors );

    //  Здесь будет запоминать имена шаблонов,
    //  чтобы отличать вызов шаблона от переменной.
    //
    this.templates = {};
};

no.inherit( Parser, BaseParser );

//  ---------------------------------------------------------------------------------------------------------------  //

//  Чтобы правильно обработать финальные dedent'ы,
//  мы добавляем в input дополнительную строчку со специальным символом.
//  Чтобы в конце была:
//
//    * Непустая строчка
//    * Ее indent был равен нулю.
//
//  Соответственно меняем этот метод.
//
Parser.prototype.is_eof = function() {
    return ( this.line === EOF );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.add_template = function( template ) {
    var name = template.name;

    this.templates[ name ] = true;
};

Parser.prototype.is_template = function( name ) {
    return this.templates[ name ];
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.on_load = function() {
    //  См. комментарии к методу is_eof().
    this.lines.push( EOF );

    //  Стек встреченных индентов.
    //  Используется для генерации dedent'ов.
    this.indents = [];

    //  Текущий indent в символах.
    this.indent_length = 0;

    //  Текущий indent в штуках.
    this.indent = 0;
    //  Текущий dedent в штуках.
    this.dedent = 0;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.on_nextline = function() {
    //  Если мы перешли на новую строку и у нас остались необработанные
    //  indent'ы или dedent'ы, то это ошибка.
    //
    if ( this.indent ) {
        this.error( {
            id: 'UNMATCHED_TOKEN',
            token: 'INDENT',
            msg: 'Unmatched INDENT'
        } );
    }
    if ( this.dedent ) {
        this.error( {
            id: 'UNMATCHED_TOKEN',
            token: 'DEDENT',
            msg: 'Unmatched DEDENT'
        } );
    }

    //  Ищем первую непустую строку.
    var l;
    while ( true ) {
        l = this.skip_spaces();

        var is_empty = this.is_eol() || this.next( 2 ) === '//';
        if ( !is_empty ) {
            break;
        }

        //  Пустые строки и строки с комментариями пропускаем.
        this.move_y();
    }

    var indent_length = this.indent_length;

    if ( l === indent_length ) {
        //  indent не изменился по сравнению с предыдущей строкой.

        this.indent = 0;
        this.dedent = 0;

    } else if ( l > indent_length ) {
        //  indent стал больше.

        //  Запоминаем новый indent, чтобы потом правильно
        //  определить deindent'ы.
        //
        this.indents.push( l );

        //  indent — одна штука.
        this.indent = 1;
        this.dedent = 0;

    } else {
        //  indent стал меньше.

        //  indent'ов нет.
        this.indent = 0;

        //  Вычисляем количество dedent'ов.
        //
        var dedent = 0;
        var indent;
        //  Вытаскиваем из `this.indents` значения до тех пор,
        //  пока не найдем совпадающее с текущим значением indent'а.
        //
        var indents = this.indents;
        while (( indent = indents.pop() )) {
            if ( indent !== l ) {
                //  Каждое такое значение добавляет один dedent.
                dedent++;
            } else {
                //  Значение, равное текущему вытаскивать не надо было,
                //  так что возвращаем его обратно в стек.
                //
                //  FIXME: Не делать лишних push/pop.
                indents.push( indent );
                break;
            }
        }

        if ( !dedent ) {
            //  Наше значение dedent'а не соответствует ни одному
            //  из предыдущих значений indent'ов.
            //
            this.error( {
                id: 'PARSE_ERROR',
                msg: 'Wrong DEDENT'
            } );
        }

        //  Нашлось энцать dedent'ов.
        this.dedent = dedent;

    }

    //  Обновляем текущее значение indent'а (в символах).
    this.indent_length = l;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.is_indent = function() {
    return ( this.indent > 0 );
};

Parser.prototype.match_indent = function() {
    if ( !this.is_indent() ) {
        this.error( {
            id: 'TOKEN_EXPECTED',
            token: 'INDENT',
            msg: 'INDENT expected'
        } );
    }

    //  В строке может быть только один indent.
    //  Поэтому просто обнуляем.
    //
    this.indent = 0;
};

Parser.prototype.is_dedent = function() {
    return ( this.dedent > 0 );
};

Parser.prototype.match_dedent = function() {
    if ( !this.is_dedent() ) {
        this.error( {
            id: 'TOKEN_EXPECTED',
            token: 'DEDENT',
            msg: 'DEDENT expected'
        } );
    }

    //  В отличие от indent'ов, dedent'ов может быть несколько.
    //
    this.dedent--;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_spaces = /^\s+/;

function get_indent_length( s ) {
    var r = s.match( rx_spaces );

    return r && r[0].length;
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = Parser;

//  ---------------------------------------------------------------------------------------------------------------  //

