var no = require( 'nommon' );

var path_ = require( 'path' );
var fs_ = require( 'fs' );

//  ---------------------------------------------------------------------------------------------------------------  //

var teya = require( './teya.js' );
require( './terror.js' );
require( './grammar.js' );
require( './factory.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var EOF = '\0';

var rx_spaces = /^ +/;

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser = function() {
    var grammar = teya.grammar;
    //
    this.tokens = grammar.tokens;
    this.rules = grammar.rules;
    this.skippers = grammar.skippers;

    this.factory = teya.factory;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.load = function( filename ) {
    this.filename = path_.resolve( filename );

    var input = fs_.readFileSync( this.filename, 'utf-8' );
    //  Strip UTF-8 BOM.
    if ( input.charAt( 0 ) === '\ufeff' ) {
        input = input.substr( 1 );
    }

    this.input = input;
    this.lines = input.split( '\n' );
    //  См. комментарии к методу is_eof().
    this.lines.push( EOF );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.parse = function( filename ) {
    this.load( filename );

    this.first_pass();
    var ast = this.second_pass();

    return ast;
};

teya.Parser.prototype.reset = function() {
    //  Текущее положение парсера в потоке.
    this.line = this.lines[ 0 ];
    this.l = this.line.length;
    this.x = 0;
    this.y = 0;

    this.skipper = null;
};

teya.Parser.prototype.first_pass = function() {
    var modules = this.modules = {};
    var templates_names = this.templates_names = {};

    this.reset();

    while ( !this.is_eof() ) {
        var id = this.is_token( 'id' );
        if ( !id ) {
            this.move_y( 1 );
            continue;
        }

        if ( id === 'import' ) {
            this.move_skip( 6, 'spaces' );

            var filename = this.match( 'inline_string', { no_expr: true, no_esc: true } );
            var dirname = path_.dirname( this.filename );
            filename = path_.resolve( dirname, filename.as_string() );

            var a_module = teya.parse( filename );

            var namespace;
            this.skip( 'spaces' );
            if ( this.is_token( 'as' ) ) {
                this.move_skip( 2, 'spaces' );
                namespace = this.token( 'id' );

                modules[ namespace ] = true;
            }

            var module_defs = a_module.defs.items;
            for ( var i = 0, l = module_defs.length; i < l; i++ ) {
                var def = module_defs[ i ];
                if ( def.id === 'def_template' ) {
                    var template_name = ( namespace ) ? namespace + '.' + def.name : def.name;
                    templates_names[ template_name ] = true;
                }
            }

            this.move_y( 1 );
            continue;
        }

        //  FIXME: Тут может быть еще `func`.

        var template_name = id;
        this.move_x( id.length );
        while ( this.is_token( '.' ) ) {
            this.move_x( 1 );
            template_name += '.' + this.token( 'id' );
        }

        this.skip( 'spaces' );
        if ( !this.is_token( '=' ) ) {
            templates_names[ template_name ] = true;
        }

        this.move_y( 1 );
    }
};

teya.Parser.prototype.second_pass = function() {
    this.reset();

    //  Здесь будет запоминать имена шаблонов,
    //  чтобы отличать вызов шаблона от переменной.
    //
    this.templates_calls = [];

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

    return this.match( 'module' );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.skip_spaces = function() {
    var spaces = this.line.match( rx_spaces );
    var l = ( spaces ) ? spaces[ 0 ].length : 0;

    if ( l ) {
        this.move_x( l ) ;
    }

    return l;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.cur = function() {
    return JSON.stringify( this.line.substr( this.x ) );
};

teya.Parser.prototype.next = function( n ) {
    return this.line.substr( this.x, n );
};

teya.Parser.prototype.next_char = function() {
    return this.line.charAt( this.x );
};

teya.Parser.prototype.next_code = function() {
    return this.line.charCodeAt( this.x );
};

teya.Parser.prototype.move_x = function( n ) {
    this.x += n;
};

teya.Parser.prototype.move_skip = function( n, id ) {
    this.x += n;
    this.skip( id );
};

teya.Parser.prototype.move_y = function() {
    this.x = 0;
    var y = this.y += 1;

    var line = this.line = this.lines[ y ];
    this.l = line.length;
};

teya.Parser.prototype.is_eol = function() {
    return ( this.x >= this.l );
};

teya.Parser.prototype.eol = function() {
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
teya.Parser.prototype.is_eof = function() {
    return ( this.line === EOF );
};

teya.Parser.prototype.eof = function() {
    if ( !this.is_eof() ) {
        this.error( 'TOKEN_EXPECTED', { token: 'EOF' } );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_pos = function() {
    return {
        x: this.x,
        y: this.y,

        //  Эти два поля нужны только для показа ошибок.
        input: this.input,
        filename: this.filename
    };
};

teya.Parser.prototype.set_pos = function( pos ) {
    //  `get_pos` и `set_pos` не совсем симметричны.
    //  В `set_pos` мы никак не учитываем `pos.input` и `pos.filename`.
    //  Потому что `set_pos` используется только для backtrace'а
    //  после lookahead'а на несколько токенов.
    //  Поэтому ни `this.input`, ни `this.filename` при этом не меняется.

    this.x = pos.x;
    var y = this.y = pos.y;

    var line = this.line = this.lines[ y ];
    this.l = line.length;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.skip = function( id ) {
    var skipper = this.skippers[ id || this.skipper ];
    if ( skipper ) {
        return skipper( this );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.is_token = function( id ) {
    if ( this.is_eof() ) {
        return false;
    }

    /*
    if ( !this.tokens[ id ] ) {
        console.log( 'No token %s', id );
    }
    */
    return this.tokens[ id ]( this );
};

teya.Parser.prototype.is_all_tokens = function() {
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

teya.Parser.prototype.any_token = function() {
    for ( var i = 0, l = arguments.length; i < l; i++ ) {
        var r = this.is_token( arguments[ i ] );

        if ( r ) {
            this.move_skip( r.length );

            return r;
        }
    }

    this.error( 'TOKENS_EXPECTED', { tokens: [].join.call( arguments, ', ' ) } );
};

teya.Parser.prototype.token = function( id ) {
    //  console.log( 'TOKEN', id, this.cur() );
    var r = this.is_token( id );

    if ( !r ) {
        this.error( 'TOKEN_EXPECTED', { token: id } );
    }

    this.move_x( r.length );
    this.skip();
    //  console.log( 'TOKEN_DONE', id, r, this.cur() );

    return r;
};

teya.Parser.prototype.match = function( id, params ) {
    //  console.log( 'RULE', id, this.line );
    var rule = this.rules[ id ];
    if ( !rule ) {
        console.log( 'Unknown rule %s', id );
    }
    var ast = this.rules[ id ]( this, params );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_skipper = function() {
    return this.skipper;
};

teya.Parser.prototype.set_skipper = function( id ) {
    var skipper = this.skipper;

    this.skipper = id;
    this.skip( id );

    return skipper;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.ast = function( id, params ) {
    return this.factory.ast( id, this.get_pos(), params );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.on_line_end = function() {
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

teya.Parser.prototype.on_line_start = function() {
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
    //  Начинаем парсинг строки с первого непробельного символа.
    this.x = l;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.is_indent = function() {
    return ( this.indent > 0 );
};

teya.Parser.prototype.match_indent = function() {
    if ( !this.is_indent() ) {
        this.error( 'TOKEN_EXPECTED', { token: 'indent' } );
    }

    //  В строке может быть только один indent.
    //  Поэтому просто обнуляем.
    //
    this.indent = 0;
};

teya.Parser.prototype.is_dedent = function() {
    return ( this.dedent > 0 );
};

teya.Parser.prototype.match_dedent = function() {
    if ( !this.is_dedent() ) {
        this.error( 'TOKEN_EXPECTED', { token: 'dedent' } );
    }

    //  В отличие от indent'ов, dedent'ов может быть несколько.
    //
    this.dedent--;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.error = function( id, params ) {
    throw new teya.Terror( id, params, this.get_pos() );
};

//  ---------------------------------------------------------------------------------------------------------------  //

function get_indent_length( s ) {
    var r = s.match( rx_spaces );

    return r && r[0].length;
}

//  ---------------------------------------------------------------------------------------------------------------  //

