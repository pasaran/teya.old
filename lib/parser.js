var no = require( 'nommon' );

var Terror = require( './terror.js' );

var path_ = require( 'path' );
var fs_ = require( 'fs' );

//  ---------------------------------------------------------------------------------------------------------------  //

var EOF = '\0';

var rx_spaces = /^ +/;

//  ---------------------------------------------------------------------------------------------------------------  //

var Parser = function( grammar, factory ) {
    this.rules = grammar.rules;
    this.tokens = {};
    this.skippers = {};

    this.add_tokens( grammar.tokens );
    this.add_keywords( grammar.keywords );
    this.add_skippers( grammar.skippers );

    this.factory = factory;

    //  Здесь будет запоминать имена шаблонов,
    //  чтобы отличать вызов шаблона от переменной.
    //
    this.templates = {};
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.add_tokens = function( tokens ) {
    for ( var id in tokens ) {
        this.tokens[ id ] = compile_token( tokens[ id ] );
    }
};

function compile_token( token ) {
    if ( typeof token === 'string' ) {
        var l = token.length;

        if ( l === 1 ) {
            return function( parser ) {
                return ( parser.line.charAt( 0 ) === token ) ? token : null;
            };

        } else {
            return function( parser ) {
                return ( parser.next( l ) === token ) ? token : null;
            };

        }
    }

    if ( token instanceof RegExp ) {
        return function( parser ) {
            var r = token.exec( parser.line );

            return ( r ) ? r[ 0 ] : null;
        };
    }

    //  Should be a function.
    return token;
}

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.add_keywords = function( keywords ) {
    for ( var i = 0, l = keywords.length; i < l; i++ ) {
        var keyword = keywords[ i ];

        this.tokens[ keyword ] = compile_keyword( keyword );
    }
};

function compile_keyword( keyword ) {
    var l = keyword.length;

    return function( parser ) {
        var line = parser.line;

        if ( line.substr( 0, l ) !== keyword ) {
            return null;
        }

        var c = line.charCodeAt( l );
        //  Смотрим, нет ли за найденной строкой чего-нибудь из [a-zA-Z0-9_-].
        if ( (c > 64 && c < 91) || (c > 96 && c < 123) || (c > 47 && c < 58) || c === 95 || c === 45 ) {
            return null;
        }

        return keyword;
    };
}

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.add_skippers = function( skippers ) {
    for ( var id in skippers ) {
        this.skippers[ id ] = compile_skipper( skippers[ id ] );
    }
};

function compile_skipper( skipper ) {
    if ( skipper instanceof RegExp ) {
        return function( parser ) {
            var r = skipper.exec( parser.line );

            var s = r && r[ 0 ];
            if ( s ) {
                parser.move_x( s.length );
            }

            return s;
        };
    }

    //  Should be a function.
    return skipper;
}

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.load_string = function( input ) {
    this.filename = null;

    this.input = input;
    this.lines = input.split( '\n' );

    //  Текущее положение парсера в потоке.
    this.x = 0;
    this.y = 0;
    this.line = this.lines[ 0 ];

    this.skipper = null;

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

    this.on_line_start();
};

Parser.prototype.load_file = function( filename ) {
    filename = path_.resolve( filename );

    var content = fs_.readFileSync( filename, 'utf-8' );
    //  Strip UTF-8 BOM.
    if ( content.charAt( 0 ) === '\ufeff' ) {
        content = content.substr( 1 );
    }

    this.load_string( content );

    //  Метод `this.load_string()` зануляет `this.filename`,
    //  поэтому присваиваем `this.filename` в самом конце.
    this.filename = filename;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.skip_spaces = function() {
    var spaces = this.line.match( rx_spaces );
    var l = ( spaces ) ? spaces[ 0 ].length : 0;

    if ( l ) {
        this.move_x( l ) ;
    }

    return l;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.next = function( n ) {
    return this.line.substr( 0, n );
};

Parser.prototype.next_char = function() {
    return this.line.charAt( 0 );
};

Parser.prototype.next_code = function() {
    return this.line.charCodeAt( 0 );
};

Parser.prototype.move_x = function( n ) {
    this.x += n;

    this.line = this.line.substr( n );
};

Parser.prototype.move_y = function() {
    this.x = 0;
    var y = this.y += 1;

    this.line = this.lines[ y ];
};

Parser.prototype.is_eol = function() {
    return ( this.line === '' );
};

Parser.prototype.eol = function() {
    if ( !this.is_eol() ) {
        this.error( 'TOKEN_EXPECTED', { token: 'EOL' } );
    }

    this.on_line_end();

    this.move_y();

    this.on_line_start();
};

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

Parser.prototype.eof = function() {
    if ( !this.is_eof() ) {
        this.error( 'TOKEN_EXPECTED', { token: 'EOF' } );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.get_pos = function() {
    return {
        x: this.x,
        y: this.y,

        //  Эти два поля нужны только для показа ошибок.
        input: this.input,
        filename: this.filename
    };
};

Parser.prototype.set_pos = function( pos ) {
    //  `get_pos` и `set_pos` не совсем симметричны.
    //  В `set_pos` мы никак не учитываем `pos.input` и `pos.filename`.
    //  Потому что `set_pos` используется только для backtrace'а
    //  после lookahead'а на несколько токенов.
    //  Поэтому ни `this.input`, ни `this.filename` при этом не меняется.

    var x = this.x = pos.x;
    var y = this.y = pos.y;

    this.line = this.lines[ y ].substr( x );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.skip = function( id ) {
    var skipper = this.skippers[ id || this.skipper ];
    if ( skipper ) {
        return skipper( this );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.is_token = function( id ) {
    if ( this.is_eof() ) {
        return false;
    }

    return this.tokens[ id ]( this );
};

Parser.prototype.is_all_tokens = function() {
    var pos = this.get_pos();

    var r = true;
    for ( var i = 0, l = arguments.length; i < l; i++ ) {
        var r = this.is_token( arguments[ i ] );

        if ( !r ) {
            r = false;
            break;
        }

        this.move_x( r.length );
        this.skip();
    }

    this.set_pos( pos );

    return r;
};

Parser.prototype.is_any_token = function() {
    for ( var i = 0, l = arguments.length; i < l; i++ ) {
        var r = this.is_token( arguments[ i ] );

        if ( r ) {
            this.move_x( r.length );
            this.skip();

            return r;
        }
    }

    this.error( 'TOKENS_EXPECTED', { tokens: [].join.call( arguments, ', ' ) } );
};

Parser.prototype.token = function( id ) {
    //  console.log( 'TOKEN', id, this.line );
    var r = this.is_token( id );

    if ( !r ) {
        this.error( 'TOKEN_EXPECTED', { token: id } );
    }

    this.move_x( r.length );
    this.skip();

    return r;
};

Parser.prototype.match = function( id, params ) {
    //  console.log( 'RULE', id, this.line );
    var ast = this.rules[ id ]( this, params );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.get_skipper = function() {
    return this.skipper;
};

Parser.prototype.set_skipper = function( id ) {
    var skipper = this.skipper;

    this.skipper = id;
    this.skip( id );

    return skipper;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.ast = function( id, params ) {
    return this.factory.ast( id, this.get_pos(), params );
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

Parser.prototype.on_line_end = function() {
    //  Если перед переходом на следующую строку у нас остались необработанные
    //  indent'ы или dedent'ы, то это ошибка.
    //
    if ( this.indent ) {
        this.error( 'UNMATCHED_TOKEN', { token: 'indent' } );
    }
    if ( this.dedent ) {
        this.error( 'UNMATCHED_TOKEN', { token: 'dedent' } );
    }
};

Parser.prototype.on_line_start = function() {
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
            this.error( 'WRONG_DEDENT' );
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
        this.error( 'TOKEN_EXPECTED', { token: 'indent' } );
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
        this.error( 'TOKEN_EXPECTED', { token: 'dedent' } );
    }

    //  В отличие от indent'ов, dedent'ов может быть несколько.
    //
    this.dedent--;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.error = function( id, params ) {
    throw new Terror( id, params, this.get_pos() );
};

//  ---------------------------------------------------------------------------------------------------------------  //

function get_indent_length( s ) {
    var r = s.match( rx_spaces );

    return r && r[0].length;
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = Parser;

//  ---------------------------------------------------------------------------------------------------------------  //

