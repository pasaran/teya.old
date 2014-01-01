var teya = require( './teya.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var path_ = require( 'path' );
var fs_ = require( 'fs' );

//  ---------------------------------------------------------------------------------------------------------------  //

//  require( './ast.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser = function( grammar, factory ) {
    this.tokens = {};
    this.rules = {};
    this.skippers = {};

    /*
    this.add_tokens( grammar.tokens );
    this.add_keywords( grammar.keywords );
    this.add_rules( grammar.rules );
    this.add_skippers( grammar.skippers );

    this.factory = factory;
    */
}

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.load_string = function( string ) {
    this.lines = string.split( '\n' );

    this.x = 0;
    this.y = 0;
    this.input = this.lines[ 0 ];

    this.indents = [];
    this.current_indent = 0;
    this.indent = 0;
    this.dedent = 0;
    this.check_indent();

    this.skipper = null;
};

teya.Parser.prototype.load_file = function( filename ) {
    this.filename = path_.resolve( filename );

    var content = fs_.readFileSync( this.filename, 'utf-8' );
    //  Strip UTF-8 BOM.
    if ( content.charAt( 0 ) === '\ufeff' ) {
        content = content.substr( 1 );
    }

    this.load_string( content );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.check_indent = function() {
    if ( this.is_eof() ) {
        this.indent = 0;
        this.dedent = this.indents.length;

        return;
    }

    var l = this.skip_spaces();
    if ( !l || this.is_eol() ) {
        return;
    }

    var current_indent = this.current_indent;

    if ( l === current_indent ) {
        this.indent = 0;
        this.dedent = 0;

    } else if ( l > current_indent ) {
        this.indents.push( l );

        this.indent = 1;
        this.dedent = 0;

    } else {
        this.indent = 0;

        var dedent = 0;
        var indent;
        var indents = this.indents;
        while (( indent = indents.pop() )) {
            if ( indent !== l ) {
                dedent++;
            } else {
                //  FIXME: Не делать лишних push/pop.
                indents.push( indent );
                break;
            }
        }

        if ( !dedent ) {
            this.error( 'Wrong DEDENT' );
        }
        this.dedent = dedent;

    }

    this.current_indent = l;
};

teya.Parser.prototype.skip_spaces = function() {
    var spaces = this.input.match( /^ +/ );
    var l = ( spaces ) ? spaces[ 0 ].length : 0;

    if ( l ) {
        this.move_x( l ) ;
    }

    return l;
};

teya.Parser.prototype.is_indent = function() {
    return ( this.indent > 0 );
};

teya.Parser.prototype.match_indent = function() {
    if ( !this.indent ) {
        this.error( 'INDENT expected' );
    }

    this.indent = 0;
};

teya.Parser.prototype.is_dedent = function() {
    return ( this.dedent > 0 );
};

teya.Parser.prototype.match_dedent = function() {
    if ( !this.dedent ) {
        this.error( 'DEINDENT expected' );
    }

    this.dedent--;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.next = function( n ) {
    return ( n ) ? this.input.charAt( 0 ) : this.input.substr( 0, n );
};

teya.Parser.prototype.move_x = function( n ) {
    this.x += n;

    this.input = this.input.substr( n );
};

teya.Parser.prototype.move_y = function() {
    this.x = 0;
    var y = this.y += 1;

    this.input = this.lines[ y ];

    this.check_indent();
};

teya.Parser.prototype.is_eol = function() {
    return ( this.input === '' );
};

teya.Parser.prototype.match_eol = function() {
    if ( !this.is_eol() ) {
        this.error( 'EOL expected' );
    }

    this.move_y();
    this.skip();
};

teya.Parser.prototype.is_eof = function() {
    return ( this.input === undefined );
};

teya.Parser.prototype.match_eof = function() {
    if ( !this.is_eof() ) {
        this.error( 'EOF expected' );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.error = function(msg) {
    throw new Error( msg );
    //  FIXME
    //  teya.AST.error( msg, this.get_where() );
};

/*
//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_where = function() {
    return {
        x: this.x,
        y: this.y,
        filename: this.filename
    };
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_pos = function() {
    return {
        x: this.x,
        y: this.y
    };
};

teya.Parser.prototype.set_pos = function(pos) {
    var x = this.x = pos.x;
    var y = this.y = pos.y;

    this.input = this.lines[y].substr(x);
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_ast = function(id, params) {
    return this.factory.make( id, this.get_where(), params );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.skip = function(id) {
    id = id || this.skipper;

    if (id) {
        return this.skippers[id](this);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_token = function(id) {
    var token = this.tokens[id];
    if (!token) {
        token = this.add_token(id, id);
    }

    return token;
};

//  ---------------------------------------------------------------------------------------------------------------  //
//  Test / Match
//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.is_token = function(id) {
    return this.get_token(id)(this);
};

teya.Parser.prototype.token = function(id) {
    var r = this.is_token(id);

    if (!r) {
        this.error('Token ' + id + ' expected');
    }

    this.move(r.length);

    this.skip();

    return r;
};

teya.Parser.prototype.is_tokens = function() {
    var pos = this.get_pos();

    var r = true;
    for (var i = 0, l = arguments.length; i < l; i++) {
        var r = this.is_token( arguments[i] );

        if (!r) {
            r = false;
            break;
        }

        this.move(r.length);
        this.skip();
    }

    this.set_pos(pos);

    return r;
};

teya.Parser.prototype.match = function(id, params) {
    return this.rules[id](this, params);
};

teya.Parser.prototype.match_any = function() {
    for (var i = 0, l = arguments.length; i < l; i++) {
        var r = this.is_token( arguments[i] );

        if (r) {
            this.move(r.length);
            this.skip();

            return r;
        }
    }

    this.error( 'Expected: ' + arguments.join(', ') );
};

//  ---------------------------------------------------------------------------------------------------------------  //
//  Getters / Setters
//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_skipper = function() {
    return this.skipper;
};

teya.Parser.prototype.set_skipper = function(id) {
    var skipper = this.skipper;

    this.skipper = id;
    this.skip();

    return skipper;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.get_state = function() {
    return {
        pos: this.get_pos(),
        skipper: this.get_skipper()
    };
};

teya.Parser.prototype.set_state = function(state) {
    this.set_pos(state.pos);
    this.set_skipper(state.skipper);
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.add_tokens = function(tokens) {
    tokens = tokens || {};
    for (var id in tokens) {
        this.add_token( id, tokens[id] );
    }
};

teya.Parser.prototype.add_token = function(id, token) {
    var compiled = compile_token(token);
    this.tokens[ id.toUpperCase() ] = compiled;

    return compiled;
};

function compile_token(token) {
    if (typeof token === 'string') {
        var l = token.length;

        return function(parser) {
            return ( parser.next(l) === token ) ? token : null;
        };
    }

    if (token instanceof RegExp) {
        return function(parser) {
            var r = token.exec(parser.input);

            return (r) ? r[0] : null;
        };
    }

    //  Should be a function.
    return token;
}

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.add_keywords = function(keywords) {
    keywords = keywords || [];

    var that = this;
    keywords.forEach(function(keyword) {
        var l = keyword.length;
        that.add_token(keyword, function(parser) {
            var input = parser.input;

            if ( input.substr(0, l) !== keyword ) {
                return null;
            }

            var c = input.charCodeAt(l);
            if ( (c > 64 && c < 91) || (c > 96 && c < 123) || (c > 47 && c < 58) || c === 95 || c === 45 ) {
                return null;
            }

            return keyword;
        });
    });
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.add_rules = function(rules) {
    rules = rules || {};
    for (var id in rules) {
        this.add_rule( id, rules[id] );
    }
};

teya.Parser.prototype.add_rule = function(id, rule) {
    if (typeof rule === 'function') {
        this.rules[id] = compile_rule(id, rule);
    } else {
        this.rules[id] = compile_rule(id, rule.rule, rule.options);
    }
};

function compile_rule(id, rule, options) {
    var wrapper = function(parser, params) {
        var ast = parser.get_ast(id);
        var r = rule(parser, ast, params);

        return (r === undefined) ? ast : r;
    };

    var skipper = options && options.skipper;
    if (skipper) {
        return function(parser, params) {
            var _skipper = parser.set_skipper(skipper);

            var r = wrapper(parser, params);

            parser.set_skipper(_skipper);

            return r;
        };
    }

    return wrapper;
}

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Parser.prototype.add_skippers = function(skippers) {
    skippers = skippers || {};
    for (var id in skippers) {
        this.add_skipper( id, skippers[id] );
    }
};

teya.Parser.prototype.add_skipper = function(id, skipper) {
    this.skippers[id] = compile_skipper(id, skipper);
};

function compile_skipper(id, skipper) {
    if (skipper instanceof RegExp) {
        return function(parser) {
            var r = skipper.exec( parser.input );

            if (r) {
                var s = r[0];
                if (s) {
                    parser.move(s.length);
                    //  Что-то поскипали.
                    return true;
                }
            }
        };
    }

    //  Should be a function.
    return skipper;
}

//  ---------------------------------------------------------------------------------------------------------------  //
*/

