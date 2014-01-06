var no = require( 'nommon' );

var path_ = require( 'path' );
var fs_ = require( 'fs' );

//  ---------------------------------------------------------------------------------------------------------------  //

var Parser = function( grammar, base,  asts ) {
    this.rules = grammar.rules;
    this.tokens = {};
    this.skippers = {};

    this.add_tokens( grammar.tokens );
    this.add_skippers( grammar.skippers );
    /*
    this.add_keywords( grammar.keywords );
    */

    this.gen_ctors( base, asts );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.load_string = function( string ) {
    this.lines = string.split( '\n' );

    //  Текущее положение парсера в потоке.
    this.x = 0;
    //  Тут -1, чтобы чуть ниже сделать `this.move_y()`.
    this.y = -1;

    //  Стек индентов. Используется для генерации DEDENT'ов.
    this.indents = [];
    //  Текущий indent в символах.
    this.indent_length = 0;
    //  Текущий indent в штуках.
    this.indent = 0;
    //  Текущий dedent в штуках.
    this.dedent = 0;

    //  Берем первую строку (нулевую) и
    //  инициализируем инденты.
    //
    this.move_y();

    this.skipper = null;
};

Parser.prototype.load_file = function( filename ) {
    this.filename = path_.resolve( filename );

    var content = fs_.readFileSync( this.filename, 'utf-8' );
    //  Strip UTF-8 BOM.
    if ( content.charAt( 0 ) === '\ufeff' ) {
        content = content.substr( 1 );
    }

    this.load_string( content );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.check_indent = function() {
    if ( this.is_eof() ) {
        //  FIXME: Это нужно делать не на EOF, а на последней строке файла.
        //  Даже если мы достигли конца файла,
        //  там могли остаться необработанные dedent'ы.
        this.indent = 0;
        this.dedent = this.indents.length;

        return;
    }

    //  Пропускаем начальные пробелы
    //  и определяем indent для новой строки.
    //
    var l = this.skip_spaces();

    if ( this.is_eol() ) {
        //  Пропускаем пустые строки и строки из одних пробелов.
        return;
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
            this.error( 'Wrong DEDENT' );
        }

        //  Нашлось энцать dedent'ов.
        this.dedent = dedent;

    }

    //  Обновляем текущее значение indent'а (в символах).
    this.indent_length = l;
};

Parser.prototype.skip_spaces = function() {
    //  FIXME: Нужно правильно учитывать tab'ы.

    var spaces = this.input.match( /^ +/ );
    var l = ( spaces ) ? spaces[ 0 ].length : 0;

    if ( l ) {
        this.move_x( l ) ;
    }

    return l;
};

Parser.prototype.is_indent = function() {
    return ( this.indent > 0 );
};

Parser.prototype.match_indent = function() {
    if ( !this.indent ) {
        this.error( 'INDENT expected' );
    }

    //  В каждой позиции может быть только один indent.
    //  Поэтому просто обнуляем.
    //
    this.indent = 0;
};

Parser.prototype.is_dedent = function() {
    return ( this.dedent > 0 );
};

Parser.prototype.match_dedent = function() {
    if ( !this.dedent ) {
        this.error( 'DEINDENT expected' );
    }

    //  В отличие от indent'ов, dedent'ов может быть несколько.
    this.dedent--;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.next = function( n ) {
    return ( n ) ? this.input.charAt( 0 ) : this.input.substr( 0, n );
};

Parser.prototype.next_char = function() {
    return this.input.chatAt( 0 );
};

Parser.prototype.move_x = function( n ) {
    this.x += n;

    this.input = this.input.substr( n );
};

Parser.prototype.move_y = function() {
    this.x = 0;
    var y = this.y += 1;

    this.input = this.lines[ y ];

    this.check_indent();
};

Parser.prototype.is_eol = function() {
    return ( this.input === '' );
};

Parser.prototype.match_eol = function() {
    if ( !this.is_eol() ) {
        this.error( 'EOL expected' );
    }

    this.move_y();
};

Parser.prototype.is_eof = function() {
    return ( this.input === undefined );
};

Parser.prototype.match_eof = function() {
    if ( !this.is_eof() ) {
        this.error( 'EOF expected' );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.error = function( msg ) {
    throw new Error( msg );
    //  FIXME
    //  teya.AST.error( msg, this.get_where() );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.get_where = function() {
    return {
        x: this.x,
        y: this.y,
        filename: this.filename
        //  FIXME: Тут еще нужно добавить весь input.
        //  Т.к. мы можем парсить строку, а не файл.
    };
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.get_pos = function() {
    return {
        x: this.x,
        y: this.y
    };
};

Parser.prototype.set_pos = function( pos ) {
    var x = this.x = pos.x;
    var y = this.y = pos.y;

    this.input = this.lines[ y ].substr( x );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.skip = function( id ) {
    return this.skippers[ id || this.skipper ]( this );
};

//  ---------------------------------------------------------------------------------------------------------------  //
//  Test / Match
//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.is_token = function( id ) {
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

    this.error( 'Expected: ' + arguments.join(', ') );
};

Parser.prototype.token = function( id ) {
    var r = this.is_token( id );

    if ( !r ) {
        this.error( 'Token ' + id + ' expected' );
    }

    this.move_x( r.length );
    this.skip();

    return r;
};

Parser.prototype.match = function( id, parent, params ) {
    return this.rules[ id ]( this, parent, params );
};

//  ---------------------------------------------------------------------------------------------------------------  //
//  Getters / Setters
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

/*
Parser.prototype.get_state = function() {
    return {
        pos: this.get_pos(),
        skipper: this.get_skipper()
        //  FIXME: Информация про indent/dedent'ы.
    };
};

Parser.prototype.set_state = function( state ) {
    this.set_pos( state.pos );
    this.set_skipper( state.skipper );
};
*/

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.add_tokens = function( tokens ) {
    if ( !tokens ) {
        return;
    }

    for ( var id in tokens ) {
        this.tokens[ id ] = compile_token( tokens[ id ] );
    }
};

function compile_token( token ) {
    if ( typeof token === 'string' ) {
        var l = token.length;

        if ( l === 1 ) {
            return function( parser ) {
                return ( parser.input.charAt( 0 ) === token ) ? token : null;
            };

        } else {
            return function( parser ) {
                return ( parser.next( l ) === token ) ? token : null;
            };

        }
    }

    if ( token instanceof RegExp ) {
        return function( parser ) {
            var r = token.exec( parser.input );

            return ( r ) ? r[ 0 ] : null;
        };
    }

    //  Should be a function.
    return token;
}

//  ---------------------------------------------------------------------------------------------------------------  //

/*
Parser.prototype.add_keywords = function( keywords ) {
    for (var i = 0, l = keywords.length; i < l; i++) {
        var keyword = keywords[i];
        var l = keyword.length;

        this.tokens[ keyword ] = function( parser ) {
            var input = parser.input;

            if ( input.substr( 0, l ) !== keyword ) {
                return null;
            }

            var c = input.charCodeAt( l );
            //  Смотрим, нет ли за найденной строкой чего-нибудь из [a-zA-Z0-9_-].
            if ( (c > 64 && c < 91) || (c > 96 && c < 123) || (c > 47 && c < 58) || c === 95 || c === 45 ) {
                return null;
            }

            return keyword;
        };
    }
};
*/

//  ---------------------------------------------------------------------------------------------------------------  //

Parser.prototype.add_skippers = function( skippers ) {
    for ( var id in skippers ) {
        this.skippers[ id ] = compile_skipper( id, skippers[ id ] );
    }
};

function compile_skipper( id, skipper ) {
    if ( skipper instanceof RegExp ) {
        return function( parser ) {
            var r = skipper.exec( parser.input );

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

Parser.prototype.ast = function( id, parent ) {
    var ctor = this.ctors[ id ];

    return new ctor( this.get_pos(), parent );
};

Parser.prototype.gen_ctors = function( base, asts ) {
    var ctors = this.ctors = {
        '': base
    };

    for (var id in asts ) {

        var ctor = function( pos, parent ) {
            this.pos = pos;
            this.parent = parent || null;
            this.scope = ( parent ) ? parent.scope : new Scope();

            this._init();
        };

        var methods = asts[ id ] || {};
        var options = (( methods.options = methods.options || {} ));

        var base = ctors[ options.base || '' ];

        var mixin;
        if ( options.mixin ) {
            mixin = options.mixin.split( ' ' )
                .map( function( id ) {
                    return asts[ id ];
                } );
        } else {
            mixin = [];
        }
        mixin.push( methods );

        no.inherit( ctor, base, mixin );

        var proto = ctor.prototype;

        proto.id = id;

        if ( options.props ) {
            var props = options.props.split( ' ' );

            if ( !methods.apply ) {
                proto.apply = gen_apply( props );
            }
            if ( !methods.dowalk ) {
                proto.dowalk = gen_dowalk( props );
            }
            if ( !methods.walkdo ) {
                proto.walkdo = gen_walkdo( props );
            }
        }

        this.ctors[ id ] = ctor;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

function gen_apply( props ) {
    var r = 'var v;';
    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'if ( v && typeof v === "object" ) { callback( v, params ); }';
    }

    return Function( 'callback', 'params', r );
}

function gen_dowalk( props ) {
    var r = 'var v;';

    r += 'callback( this, params, pkey, pvalue );';

    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'if ( v && typeof v === "object" ) { v.dowalk( callback, params, ' + prop + ', this ); }';
    }

    return Function( 'callback', 'params', 'pkey', 'pvalue', r );
}

function gen_walkdo( props ) {
    var r = 'var v;';

    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'if ( v && typeof v === "object" ) { v.walkdo( callback, params, ' + prop + ', this ); }';
    }

    r += 'callback( this, params, pkey, pvalue );';

    return Function( 'callback', 'params', 'pkey', 'pvalue', r );
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = Parser;

//  ---------------------------------------------------------------------------------------------------------------  //

