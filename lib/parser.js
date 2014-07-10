var no = require( 'nommon' );

var path_ = require( 'path' );
var fs_ = require( 'fs' );

//  ---------------------------------------------------------------------------------------------------------------  //

var Parser = function( grammar, factory ) {
    this._init( grammar, factory );
};

Parser.prototype._init = function( grammar, factory ) {
    this.rules = grammar.rules;
    this.tokens = grammar.tokens;
    this.skippers = grammar.skippers;

    this.factory = factory;
};

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

    this.on_load();
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

Parser.prototype.on_load = no.op;
Parser.prototype.on_line_start = no.op;
Parser.prototype.on_line_end = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

//  FIXME: Нужно правильно учитывать tab'ы.
var rx_spaces = /^ +/;

Parser.prototype.skip_spaces = function() {
    var spaces = this.line.match( /^ +/ );
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

Parser.prototype.is_eof = function() {
    return ( this.line === undefined );
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

module.exports = Parser;

//  ---------------------------------------------------------------------------------------------------------------  //

