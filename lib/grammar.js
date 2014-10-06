var teya = require( './teya.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

teya.grammar = {};

//  Токены и правила грамматики.
//  Представляют собой функции, принимающие инстанс парсера
//  и возвращающие токен (или null) для токенов и AST для правил.
//
var tokens = teya.grammar.tokens = {};
var rules = teya.grammar.rules = {};

var skippers = teya.grammar.skippers = {};


//  ## Keywords
//  ---------------------------------------------------------------------------------------------------------------  //

[
    'if',
    'else if',
    'else',
    'for',
    'with',
    'func',
    'true',
    'false',
    'import',
    'as',
]
    .forEach(
        function( keyword ) {
            tokens[ keyword ] = compile_keyword( keyword );
        }
    );

//  ## Tokens
//  ---------------------------------------------------------------------------------------------------------------  //

//  Токены лучше реализовывать не через regexp'ы:
//      http://jsperf.com/parse-id-regexp-vs-charcodeat
//

//  ### Special tokens

//  /^[a-zA-Z_][a-zA-Z0-9-_]*/;
//
tokens.id = function t_id( parser ) {
    var line = parser.line;
    var l = parser.l;
    var x = parser.x;

    if ( x >= l ) {
        return null;
    }

    var c = line.charCodeAt( x );
    if ( !( c > 96 && c < 123 || c > 64 && c < 91 || c === 95 ) ) {
        //  a-zA-Z_
        return null;
    }

    var i = x + 1;
    while ( i < l ) {
        c = line.charCodeAt( i );

        if ( !( c > 96 && c < 123 || c > 64 && c < 91 || c > 47 && c < 58 || c === 95 || c === 45 ) ) {
            //  a-zA-Z0-9_-
            break;
        }

        i++;
    }

    return line.substring( x, i );
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  /^\.(?![a-zA-Z_*])/
//
tokens.self = function( parser ) {
    var line = parser.line;
    var l = parser.l;
    var x = parser.x;

    if ( x >= l ) {
        return null;
    }
    if ( line.charCodeAt( x ) !== 46 ) {
        //  .
        return null;
    }

    x++;
    if ( x < l ) {
        var c = line.charCodeAt( x );
        if ( c > 96 && c < 123 || c > 64 && c < 91 || c === 95 || c === 42 ) {
            //  NOTE: Не включаем сюда [, чтобы `.[ .foo ]` парсилось бы как `.` + `[ .foo ]` (т.е. filter).
            //  a-zA-Z_*
            return null;
        }
    }

    return '.';
}

//  /^\/(?![.[])/
//
tokens.root = function( parser ) {
    var line = parser.line;
    var l = parser.l;
    var x = parser.x;

    if ( x >= l ) {
        return null;
    }
    if ( line.charCodeAt( x ) !== 47 ) {
        //  /
        return null;
    }

    x++;
    if ( x < l ) {
        var c = line.charCodeAt( x );
        if ( c === 46 || c === 91 ) {
            //  .[
            return null;
        }
    }

    return '/';
}

//  /^[a-zA-Z0-9_][a-zA-Z0-9_-]*/
//
tokens.jstep = function t_jstep( parser ) {
    var line = parser.line;
    var l = parser.l;
    var x = parser.x;

    if ( x >= l ) {
        return null;
    }

    var c = line.charCodeAt( x );
    if ( !( c > 96 && c < 123 || c > 64 && c < 91 || c > 47 && c < 58 || c === 95 ) ) {
        //  a-zA-Z0-9_
        return null;
    }

    var i = x + 1;
    while ( i < l ) {
        c = line.charCodeAt( i );

        if ( !( c > 96 && c < 123 || c > 64 && c < 91 || c > 47 && c < 58 || c === 95 || c === 45 ) ) {
            //  a-zA-Z0-9_-
            break;
        }

        i++;
    }

    return line.substring( x, i );
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  /^["'\\nt]/
//
tokens.esc = function t_esc( parser ) {
    var x = parser.x;
    if ( x >= parser.l ) {
        return null;
    }

    var c = parser.line.charCodeAt( x );

    //  "'\nt
    if ( c === 34 ) {
        return '"';
    } else if ( c === 39 ) {
        return "'";
    } else if ( c === 92 ) {
        return '\\';
    } else if ( c === 110 ) {
        //  NOTE. Тут мы возвращаем не 'n', а сразу '\n'.
        //  Так удобнее, не нужно потом еще раз делать switch/if в string_content.
        return '\n';
    } else if ( c === 116 ) {
        //  NOTE: То же самое.
        return '\t';
    }

    return null;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  /^[0-9]+(\.[0-9]+)?/,
//
tokens.number = function t_number( parser ) {
    var line = parser.line;
    var l = parser.l;
    var x = parser.x;

    if ( x >= l ) {
        return null;
    }

    var c = line.charCodeAt( x );
    if ( !( c > 47 && c < 58 ) ) {
        return null;
    }

    var i = x + 1;
    var c;

    //  Целая часть.
    //
    //  /^[0-9]*/
    //
    while ( i < l && (( c = line.charCodeAt( i ) )) && c > 47 && c < 58 ) {
        i++;
    }

    if ( i < l ) {
        //  Дробная часть.
        if ( line.charCodeAt( i ) === 46 ) {
            //  .
            i++;

            while ( i < l && (( c = line.charCodeAt( i ) )) && c > 47 && c < 58 ) {
                i++;
            }
        }
    }

    //  TODO: Порядок. Например, 1e+2.

    return line.substring( x, i );
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  /^[ >/]/
//
tokens.xmlname_end = function t_xmlname_end( parser ) {
    var x = parser.x;

    if ( x >= parser.l ) {
        return null;
    }

    var c = parser.line.charCodeAt( x );

    //  NOTE: Тут мы возвращаем только true или false.
    //  Так как мы всегда вызывает этот токен только через `parser.is_token()`.
    //  Т.е. само значение нам не важно, только факт наличия токена в потоке.
    return ( c === 32 || c === 62  || c === 47 );
};

//  ---------------------------------------------------------------------------------------------------------------  //

tokens.eol = function( parser ) {
    return parser.is_eol();
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  /^=(?!=)/
//
tokens[ '=' ] = function( parser ) {
    var line = parser.line;
    var l = parser.l;
    var x = parser.x;

    if ( x >= l ) {
        return null;
    }
    if ( line.charCodeAt( x ) !== 61 ) {
        return null;
    }
    if ( ++x < l && line.charCodeAt( x ) === 61 ) {
        return null;
    }

    return '=';
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  ### String tokens
//
[
    '{', '}',
    '[', ']',
    '(', ')',
    '{{', '}}',
    '"', "'",
    '+', '-', '*', '/', '%',
    '||', '&&',
    '==', '===', '!=', '!==',
    '+=',
    '<=', '<', '>=', '>',
    '.', ',',
    '@', '#',
    ':',
    '!', '?',
    '/>',
    '\\',
    '...', '@..', '$..',
    '->',
]
    .forEach(
        function( s ) {
            tokens[ s ] = compile_token( s );
        }
    );


//  ## Rules
//  ---------------------------------------------------------------------------------------------------------------  //

//  ### Module, block, body
//  ---------------------------------------------------------------------------------------------------------------  //

//  module := ( def_template | def_var | def_func )*

function r_module( parser ) {
    var ast = parser.ast( 'module' );

    var vars = ast.vars;
    var templates = ast.templates;
    var imports = ast.imports;

    parser.set_skipper( 'spaces' );

    while ( !parser.is_eof() ) {
        var def;

        if ( parser.is_token( 'func' ) ) {
            //  funcs.add( r_def_func( parser ) );

        } else if ( parser.is_token( 'import' ) ) {
            imports.add( r_import( parser ) );

        } else if ( parser.is_all_tokens( 'id', '=' ) ) {
            vars.add( r_def_var( parser ) );

        } else {
            templates.add( r_def_template( parser ) );
        }
    }

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

/*
//  body := EOL block | inline_expr

rules.body = function( parser ) {
    if ( parser.is_eol() ) {
        return parser.match( 'block' );
    } else {
        var expr = parser.match( 'inline_expr' );
        parser.eol();

        return expr;
    }
}
*/

//  ---------------------------------------------------------------------------------------------------------------  //

//  block := INDENT ( def_var | expr )* DEDENT

function r_block( parser, options ) {
    var ast = parser.ast( 'block' );

    parser.eol();

    if ( parser.is_indent() ) {
        var defs = ast.defs;
        var exprs = ast.exprs;
        var params = ast.params;

        parser.match_indent();

        var parse_params = options && options.parse_params;

        while ( !parser.is_eof() && !parser.is_dedent() ) {
            //  Пропускаем пустые строки и строчные комментарии.
            if ( parser.is_eol() ) {
                parser.eol();

                continue;
            }

            if ( parser.is_all_tokens( 'id', '=' ) ) {
                defs.add( r_def_var( parser ) );
            //  TODO: Здесь еще смогут быть определения функций (а может и вложенных шаблонов).

            } else if ( parse_params && parser.is_all_tokens( 'id', ':' ) ) {
                params.add( r_block_param( parser ) );

            } else {
                exprs.add( r_expr( parser ) );
            }
        }

        parser.match_dedent();
    }

    return ast;
}

function r_block_param( parser ) {
    var ast = parser.ast( 'template_param' );

    ast.name = parser.token( 'id' );
    parser.token( ':' );
    if ( parser.is_eol() ) {
        ast.value = r_block( parser );

    } else {
        ast.value = r_expr( parser );
    }

    return ast;
}


//  ### Declarations
//  ---------------------------------------------------------------------------------------------------------------  //

//  def_template := ID def_args? body

function r_def_template( parser ) {
    var ast = parser.ast( 'def_template' );

    var name = ast.name = r_template_name( parser );

    if ( parser.is_token( ':' ) ) {
        parser.move_skip( 1 );

        ast.type = match_type( parser );
    }

    if ( parser.is_token( '(' ) ) {
        ast.args = r_def_args( parser );
    }

    parser.templates_calls.push( name );
    ast.body = r_block( parser );
    parser.templates_calls.pop();

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  def_var := ID '=' expr
//
function r_def_var( parser ) {
    var ast = parser.ast( 'def_var' );

    ast.name = parser.token( 'id' );
    parser.token( '=' );

    ast.value = r_expr( parser );

    return ast;
}

//  import := 'import' inline_string ( 'as' ID )?
//
function r_import( parser ) {
    var ast = parser.ast( 'import' );

    //  Здесь всегда import.
    //  'import'.length === 7.
    parser.move_skip( 6 );
    ast.filename = r_inline_string( parser, { no_expr: true, no_esc: true } ).as_string();

    if ( parser.is_token( 'as' ) ) {
        parser.move_skip( 2 );
        ast.namespace = parser.token( 'id' );
    }

    parser.eol();

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  def_args := '(' ( def_arg ( ',' def_arg )* )? ')'
//
function r_def_args( parser ) {
    var ast = parser.ast( 'def_args' );

    //  Здесь всегда '('.
    parser.move_skip( 1 );

    if ( !parser.is_token( ')' ) ) {
        ast.add( r_def_arg( parser ) );
        while ( parser.is_token( ',' ) ) {
            parser.move_skip( 1 );
            ast.add( r_def_arg( parser ) );
        }
    }
    parser.token( ')' );

    return ast;
}

//  def_arg := ID ( ':' type ) ( '=' inline_expr )?
//
function r_def_arg( parser ) {
    var ast = parser.ast( 'def_arg' );

    ast.name = parser.token( 'id' );

    if ( parser.is_token( ':' ) ) {
        parser.move_skip( 1 );

        ast.type = match_type( parser );
    }

    if ( parser.is_token( '=' ) ) {
        parser.move_skip( 1 );

        ast.default = r_inline_expr( parser );
    }

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

/*
//  def_func := 'func' ID def_args body

rules.def_func = function( parser ) {
    var ast = parser.ast( 'def_func' );

    parser.token( 'func' );
    var type = match_type( parser );
    if ( type ) {
        ast.type = type;
    }
    ast.name = parser.token( 'ID' );
    ast.args = parser.match( 'def_args' );
    ast.body = parser.match( 'block' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

*/


//  ### Block expressions
//  ---------------------------------------------------------------------------------------------------------------  //

//  expr := if | for | with | template | object | array | subexpr | pair | inline_pairs | inline_items | value | ... | @.. | $..

function r_expr( parser, params ) {
    if ( parser.is_token( '...' ) ) {
        return r_param_content( parser );

    } else if ( parser.is_token( '@..' ) ) {
        return r_param_content_attrs( parser );

    } else if ( parser.is_token( '$..' ) ) {
        return r_param_content_other( parser );
    }

    switch ( parser.next_char() ) {
        case '{':
            return r_object( parser );
        case '[':
            return r_array( parser );
        case '@':
            return r_attr( parser );
        case '(':
            if ( parser.is_all_tokens( '(', 'eol' ) ) {
                return r_subexpr( parser );
            }
        case '<':
            return r_xml( parser );

        /*
        case ':':
            //  TODO: Фильтры (markdown, ...).
        */
    }

    var id = parser.is_token( 'id' );
    if ( id ) {
        switch ( id ) {
            case 'if':
                return r_if( parser );
            case 'for':
                return r_for( parser );
            case 'with':
                return r_with( parser );
        }

        //  Пытаемся выяснить, нет ли тут чего-то похожего на `foo.bar.quu`.
        //  Если есть, то смотрим, является ли это именем шаблона.
        //  Если нет, то пытаемся разрезолвить `id` в имя шаблона с учетом текущего
        //  стека вложенности шаблонов.
        //
        var is_template;
        var name;
        //
        var x = parser.x;
        parser.move_x( id.length );
        var templates_names = parser.templates_names;
        //
        if ( parser.is_token( '.' ) ) {
            var skipper = parser.set_skipper( 'none' );
            name = id;
            while ( parser.is_token( '.' ) ) {
                parser.move_x( 1 );
                name += '.' + parser.token( 'id' );
            }
            parser.set_skipper( skipper );

            is_template = !!templates_names[ name ];

        } else {
            var templates_calls = parser.templates_calls;
            var postfix = '.' + id;

            for ( var i = 0, l = templates_calls.length; i < l; i++ ) {
                name = templates_calls.slice( i ).join( '.' ) + postfix;

                if ( templates_names[ name ] ) {
                    is_template = true;
                    break;
                }
            }
            if ( !is_template && templates_names[ id ] ) {
                is_template = true;
                name = id;
            }

        }
        parser.x = x;
 
        if ( is_template ) {
            return r_template( parser, name );
        }
    }

    var expr = r_inline_expr( parser );

    var ast;
    if ( expr.id === 'inline_string' && parser.is_token( ':' ) ) {
        parser.move_skip( 1 );

        if ( parser.is_eol() ) {
            parser.eol();

            return parser.ast( 'pair', {
                key: expr,
                value: r_block( parser )
            } );
        }

        //  Передаем специальный флаг `no_items`, который говорит, что не нужно
        //  пытаться распарсить конструкцию `inline_items`.
        //  Иначе, например вот в таком фрагменте:
        //
        //      {
        //          "foo": 42, "bar": 24
        //      }
        //
        //  `42, "bar"` будет воспринято как `inline_items`.
        //
        //  Кроме того, передаем флаг `no_newline`, означающий, что после
        //  инлайновых выражений (`value`, `inline_pairs`, `inline_items`)
        //  не нужно требовать перевод строки, который обычно нужен, чтобы
        //  не парсились вот такие конструкции:
        //
        //      1 2 3
        //      1, 2 3
        //      "foo": 1, "bar": 2 3
        //
        //  При этом в таком фрагменте:
        //
        //      "foo": 1, "bar": 2
        //
        //  после `1` перевод строки не нужен.
        //
        var value = r_expr(
            parser,
            {
                no_items: true,
                no_newline: true
            }
        );

        if ( value.id !== 'value' ) {
            return parser.ast( 'pair', {
                key: expr,
                value: value
            } );
        }

        //  В `value` у нас инлайновое выражение, значит генерим `inline_pairs`.
        var pair = parser.ast( 'inline_pair', {
            key: expr,
            value: value.value
        } );
        ast = r_inline_pairs( parser, pair );

    } else if ( parser.is_token( ',' ) && ( !params || !params.no_items ) ) {
        var item = parser.ast( 'inline_item', expr );
        ast = r_inline_items( parser, item );

    } else {
        ast = parser.ast( 'value', expr );

    }

    if ( !params || !params.no_newline ) {
        parser.eol();
    }

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  if := 'if' inline_expr body ( 'else if' inline_expr body )* ( 'else' body )?

function r_if( parser ) {
    var ast = parser.ast( 'if' );

    //  Здесь всегда 'if'.
    parser.move_skip( 2 );

    ast.condition = r_inline_expr( parser );

    ast.then = r_block( parser);

    var elses = ast.elses;
    while ( parser.is_token( 'else if' ) ) {
        elses.add( r_else_if( parser ) );
    }
    if ( parser.is_token( 'else' ) ) {
        elses.add( r_else( parser ) );
    }

    return ast;
}

function r_else_if( parser ) {
    var ast = parser.ast( 'else_if' );

    //  Здесь всегда 'else if'.
    parser.move_skip( 7 );
    ast.condition = r_inline_expr( parser );
    ast.body = r_block( parser );

    return ast;
}

function r_else( parser ) {
    var ast = parser.ast( 'else' );

    //  Здесь всегда 'else'.
    parser.move_skip( 4 );
    ast.body = r_block( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  for := 'for' inline_expr body

function r_for( parser ) {
    var ast = parser.ast( 'for' );

    //  Здесь всегда 'for'.
    parser.move_skip( 3 );

    ast.selector = r_inline_expr( parser );
    ast.body = r_block( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  with := 'with' inline_expr body

function r_with( parser ) {
    var ast = parser.ast( 'with' );

    //  Здесь всегда 'with'.
    parser.move_skip( 4 );

    ast.selector = r_inline_expr( parser );
    ast.body = r_block( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  template := ID template_args? block

function r_template( parser, full_name ) {
    var ast = parser.ast( 'template' );

    /// var name = ast.name = r_template_name( parser );
    r_template_name( parser );
    name = ast.name = full_name;

    if ( parser.is_token( '->' ) ) {
        parser.move_skip( 2 );

        ast.context = r_inline_expr( parser );

    } else {
        if ( !parser.is_eol() ) {
            ast.params = r_inline_params( parser );
        }

        if ( parser.is_token( '->' ) ) {
            parser.move_skip( 2 );

            ast.context = r_inline_expr( parser );
        }
    }

    parser.templates_calls.push( name );
    ast.content = r_block( parser, { parse_params: true } );
    parser.templates_calls.pop();

    return ast;
}

function r_template_name( parser ) {
    var skipper = parser.set_skipper( 'none' );

    var name = parser.token( 'id' );
    while ( parser.is_token( '.' ) ) {
        parser.move_x( 1 );
        name += '.' + parser.token( 'id' );
    }

    parser.set_skipper( skipper );

    return name;
}

function r_inline_params( parser ) {
    var ast = parser.ast( 'template_params' );

    ast.add( r_inline_param( parser ) );
    while ( parser.is_token( ',' ) ) {
        parser.move_skip( 1 );

        ast.add( r_inline_param( parser ) );
    }

    return ast;
}

function r_inline_param( parser ) {
    var ast = parser.ast( 'template_param' );

    ast.value = r_inline_expr( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  object := '{' ( EOL block | inline_pairs ) '}'

function r_object( parser ) {
    var ast = parser.ast( 'object' );

    //  Здесь всегда '{'.
    parser.move_skip( 1 );

    if ( parser.is_eol() ) {
        ast.body = r_block( parser );
    } else {
        ast.body = r_inline_pairs( parser );
    }
    parser.token( '}' );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  array := '[' ( EOL block | inline_items ) ']'

function r_array( parser ) {
    var ast = parser.ast( 'array' );

    //  Здесь всегда '['.
    parser.move_skip( 1 );

    if ( parser.is_eol() ) {
        ast.body = r_block( parser );
    } else {
        ast.body = r_inline_items( parser );
    }

    parser.token( ']' );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  subexpr := '(' ( EOL block | inline_expr ) ')'

function r_subexpr( parser ) {
    //  Здесь всегда '('.
    parser.move_skip( 1 );

    var ast;
    if ( parser.is_eol() ) {
        ast = parser.ast( 'subexpr' );

        ast.body = r_block( parser );
    } else {
        ast = r_inline_subexpr( parser );

        ast.expr = r_inline_expr( parser );
    }

    parser.token( ')' );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_pairs := ( inline_pair ( ',' inline_pair )* )?

function r_inline_pairs( parser, pair ) {
    var ast = parser.ast( 'inline_pairs' );

    if ( pair ) {
        ast.add( pair );

    } else {
        if ( parser.is_eol() || parser.is_token( '}' ) ) {
            return ast;
        }

        ast.add( r_inline_pair( parser ) );
    }

    while ( parser.is_token( ',' ) ) {
        parser.move_skip( 1 );
        ast.add( r_inline_pair( parser ) );
    }

    return ast;
}

//  inline_pair := inline_string ':' inline_expr

function r_inline_pair( parser ) {
    var ast = parser.ast( 'inline_pair' );

    ast.key = r_inline_string( parser );
    parser.token( ':' );
    ast.value = r_inline_expr( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_items := inline_item ( ',' inline_item )*

function r_inline_items( parser, item ) {
    var ast = parser.ast( 'inline_items' );

    if ( item ) {
        ast.add( item );

    } else {
        if ( parser.is_eol() || parser.is_token( ']' ) ) {
            return ast;
        }

        ast.add( r_inline_item( parser ) );
    }

    while ( parser.is_token( ',' ) ) {
        parser.move_skip( 1 );
        ast.add( r_inline_item( parser ) );
    }

    return ast;
}


//  inline_item := inline_expr

function r_inline_item( parser ) {
    var ast = parser.ast( 'inline_item' );

    ast.value = r_inline_expr( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  value := inline_expr

function r_value( parser ) {
    var ast = parser.ast( 'value' );

    ast.value = r_inline_expr( parser );

    return ast;
}


//  #### XML
//  ---------------------------------------------------------------------------------------------------------------  //

function r_xml( parser ) {
    var ast = parser.ast( 'xml' );

    //  Здесь всегда '<'.
    parser.move_x( 1 );
    ast.name = r_string_content( parser, { no_esc: true, delim: 'xmlname_end' } );

    parser.skip( 'spaces' );

    ast.attrs = r_xml_attrs( parser );

    parser.token( '>' );

    ast.content = r_block( parser );

    return ast;
}

function r_xml_attrs( parser ) {
    var ast = parser.ast( 'xml_attrs' );

    var skipper = parser.set_skipper( 'spaces' );

    while ( !( parser.is_eol() || parser.is_token( '/>' ) || parser.is_token( '>' ) ) ) {
        ast.add( r_xml_attr( parser ) );
    }

    parser.set_skipper( skipper );

    return ast;
}

function r_xml_attr( parser ) {
    var ast = parser.ast( 'xml_attr' );

    //  FIXME: Тут должен быть пробел?
    ast.name = parser.token( 'id' );
    parser.token( '=' );
    ast.value = r_inline_string( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

function r_attr( parser ) {
    var ast = parser.ast( 'attr' );

    //  Здесь всегда '@'.
    parser.move_x( 1 );

    ast.name = parser.token( 'id' );
    if ( parser.is_token( '+=' ) ) {
        parser.move_skip( 2 );
        ast.op = '+=';

    } else {
        parser.move_skip( 1 );
        ast.op = '+';
    }
    ast.value = r_expr( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

function r_param_content( parser ) {
    var ast = parser.ast( 'param_content' );

    parser.token( '...' );

    return ast;
}

function r_param_content_attrs( parser ) {
    var ast = parser.ast( 'param_content_attrs' );

    parser.token( '@..' );

    return ast;
}

function r_param_content_other( parser ) {
    var ast = parser.ast( 'param_content_other' );

    parser.token( '$..' );

    return ast;
}


//  ### Inline expressions
//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_expr := inline_or

function r_inline_expr( parser ) {
    var ast = r_inline_ternary( parser );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_ternary := inline_or ( '?' inline_expr ':' inline_expr )?

function r_inline_ternary( parser ) {
    var left = r_inline_or( parser );

    if ( parser.is_token( '?' ) ) {
        var ast = parser.ast( 'inline_ternary' );

        parser.move_skip( 1 );

        ast.condition = left;
        ast.then = r_inline_expr( parser );
        parser.token( ':' );
        ast.else = r_inline_expr( parser );

        return ast;
    }

    return left;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_or := inline_and ( '||' inline_or )?

function r_inline_or( parser ) {
    var left = r_inline_and( parser );

    if ( parser.is_token( '||' ) ) {
        var ast = parser.ast( 'inline_or' );

        parser.move_skip( 2 );

        ast.left = left;
        ast.op = '||';
        ast.right = r_inline_or( parser );

        return ast;
    }

    return left;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_and := inline_eq ( '&&' inline_and )?

function r_inline_and( parser ) {
    var left = r_inline_eq( parser );

    if ( parser.is_token( '&&' ) ) {
        var ast = parser.ast( 'inline_and' );

        parser.move_skip( 2 );

        ast.left = left;
        ast.op = '&&';
        ast.right = r_inline_and( parser );

        return ast;
    }

    return left;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_eq := inline_rel ( ( '==' | '!=' ) inline_rel )?

function r_inline_eq( parser ) {
    var left = r_inline_rel( parser );

    var op = parser.is_token( '==' ) || parser.is_token( '!=' );
    if ( op ) {
        var ast = parser.ast( 'inline_eq' );

        parser.move_skip( 2 );

        ast.left = left;
        ast.op = op;
        ast.right = r_inline_rel( parser );

        return ast;
    }

    return left;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_rel := inline_add ( ( '<=' | '<' | '>=' | '>' ) inline_add )?

function r_inline_rel( parser ) {
    var left = r_inline_add( parser );

    var op = parser.is_token( '<=' ) || parser.is_token( '<' ) || parser.is_token( '>=' ) || parser.is_token( '>' );
    if ( op ) {
        var ast = parser.ast( 'inline_rel' );

        parser.move_skip( op.length );

        ast.left = left;
        ast.op = op;
        ast.right = r_inline_add( parser );

        return ast;
    }

    return left;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_add := inline_mul ( ( '+' | '-' ) inline_add )?

function r_inline_add( parser ) {
    var left = r_inline_mul( parser );

    var op = parser.is_token( '+' ) || parser.is_token( '-' );
    if ( op ) {
        var ast = parser.ast( 'inline_add' );

        parser.move_skip( 1 );

        ast.left = left;
        ast.op = op;
        ast.right = r_inline_add( parser );

        return ast;
    }

    return left;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_mul := inline_unary ( ( '/' | '*' | '%' ) inline_mul )?

function r_inline_mul( parser ) {
    var left = r_inline_unary( parser );

    var op = parser.is_token( '/' ) || parser.is_token( '*' ) || parser.is_token( '%' );
    if ( op ) {
        var ast = parser.ast( 'inline_add' );

        parser.move_skip( 1 );

        ast.left = left;
        ast.op = op;
        ast.right = r_inline_mul( parser );

        return ast;
    }

    return left;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_unary := ( '+' | '-' ) inline_unary | inline_not

function r_inline_unary( parser ) {
    var op = parser.is_token( '+' ) || parser.is_token( '-' );
    if ( op ) {
        var ast = parser.ast( 'inline_unary' );

        parser.move_skip( 1 );

        ast.op = op;
        ast.left = r_inline_unary( parser );

        return ast;
    }

    return r_inline_not( parser );
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_not := '!' inline_union | inline_union

function r_inline_not( parser ) {
    if ( parser.is_token( '!' ) ) {
        var ast = parser.ast( 'inline_unary' );

        parser.move_skip( 1 );

        ast.op = '!';
        ast.left = r_inline_not( parser );

        return ast;
    }

    return r_inline_primary( parser );
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_primary := inline_number | inline_string | inline_subexpr | inline_var | inline_func | jpath | jpath_filter

function r_inline_primary( parser ) {
    var skipper = parser.set_skipper( 'none' );

    var expr;

    var id;
    if ( parser.is_token( 'number' ) ) {
        //  FIXME: Тут мы два раза парсим число.
        expr = r_inline_number( parser );

    } else if ( parser.is_token( '"' ) || parser.is_token( "'" ) ) {
        expr = r_inline_string( parser );

    } else if ( parser.is_token( '(' ) ) {
        expr = r_inline_subexpr( parser );

    } else if ( parser.is_token( '.' ) || parser.is_token( '/' ) ) {
        expr = r_jpath( parser );

    //  FIXME: Нужно проверять, что id -- это название функции.
    } else if ( parser.is_all_tokens( 'id', '(' ) ) {
        expr = r_inline_func( parser );

    } else if (( id = parser.is_token( 'id' ) )) {
        switch ( id ) {
            //  FIXME: Тут мы везде дважды парсим id.
            case 'true':
                expr = r_true( parser );
                break;

            case 'false':
                expr = r_false( parser );
                break;

            default:
                expr = r_inline_var( parser );
        }

    } else {
        parser.error( 'UNEXPECTED_TOKEN' );

    }

    if ( parser.is_token( '[' ) || parser.is_token( '.' ) ) {
        var filter = parser.ast( 'jpath_filter' );

        filter.expr = expr;
        filter.jpath = r_jpath( parser, { in_context: true } );

        expr = filter;
    }

    parser.set_skipper( skipper );

    return expr;
}


//  ---------------------------------------------------------------------------------------------------------------  //

function r_true( parser ) {
    var ast = parser.ast( 'true' );

    parser.token( 'true' );

    return ast;
}

function r_false( parser ) {
    var ast = parser.ast( 'false' );

    parser.token( 'false' );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_number := NUMBER

function r_inline_number( parser ) {
    var ast = parser.ast( 'inline_number' );

    ast.value = +parser.token( 'number' );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_string := '""' | "''" | '"' string_content '"' | "'" string_content "'"

function r_inline_string( parser, params ) {
    var ast = parser.ast( 'inline_string' );

    var skipper = parser.set_skipper( 'none' );

    var quote = parser.any_token( '"', "'" );
    ast.value = r_string_content(
        parser,
        {
            no_expr: params && params.no_expr,
            no_esc: params && params.no_esc,
            delim: quote
        }
    );
    parser.token( quote );

    parser.set_skipper( skipper );

    return ast;
}

//  string_content := ( string_expr | string_literal )*

//  params.no_expr  -- запрещает интерполяцию выражений в строке.
//  params.no_esc   -- не нужно учитывать esc-последовательности типа \n, \t и т.д.
//  params.delim    -- задает символ, ограничивающий строковый контент.
function r_string_content( parser, params ) {
    var ast = parser.ast( 'string_content' );

    var delim, no_expr, no_esc;
    if ( params ) {
        delim = params.delim;
        no_expr = params.no_expr;
        no_esc = params.no_esc;
    }

    var skipper = parser.set_skipper( 'none' );

    var s = '';

    while ( !parser.is_eol() && !parser.is_token( delim ) ) {
        //  FIXME: Тут, кажется, какая-то фигня с условием.
        //  Может скобки нужны?
        if ( !no_expr && parser.is_token( '{' ) || parser.is_token( '}' ) ) {
            if ( parser.is_token( '{{' ) ) {
                parser.move_x( 2 );
                s += '{';

            } else if ( parser.is_token( '}}' ) ) {
                parser.move_x( 2 );
                s += '}';

            } else if ( parser.is_token( '{' ) ) {
                if ( s ) {
                    ast.add( string_literal( s, parser ) );
                    s = '';
                }

                ast.add( r_string_expr( parser ) );

            } else {
                parser.error( {
                    id: 'UNMATCHED_TOKEN',
                    token: '}',
                    msg: 'Unmatched }'
                } );

            }

        } else if ( !no_esc && parser.is_token( '\\' ) ) {
            parser.move_x( 1 );

            var c;
            if (( c = parser.is_token( 'esc' ) )) {
                parser.move_x( 1 );

                s += c;
            }

        } else {
            s += parser.next_char();

            parser.move_x( 1 );
        }
    }

    if ( s || ast.is_empty() ) {
        ast.add( string_literal( s, parser ) );
    }

    parser.set_skipper( skipper );

    return ast;
}


//  string_expr := '{' inline_expr '}'

function r_string_expr( parser ) {
    var ast = parser.ast( 'string_expr' );

    //  Тут всегда '{'.
    parser.move_x( 1 );
    var skipper = parser.set_skipper( 'spaces' );

    ast.expr = r_inline_expr( parser );

    parser.set_skipper( skipper );
    parser.token( '}' );

    return ast;
}

function string_literal( value, parser ) {
    var ast = parser.ast( 'string_literal' );

    ast.value = value;

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_subexpr := '(' inline_expr ')'

function r_inline_subexpr( parser ) {
    var ast = parser.ast( 'inline_subexpr' );

    //  Тут всегда '('.
    parser.move_skip( 1 );
    ast.expr = r_inline_expr( parser );
    parser.token( ')' );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_var := ID

function r_inline_var( parser ) {
    var ast = parser.ast( 'inline_var' );

    ast.name = parser.token( 'id' );

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_func := ID inline_func_args

function r_inline_func( parser ) {
    var ast = parser.ast( 'inline_func' );

    ast.name = parser.token( 'id');
    ast.args = r_inline_func_args( parser );

    return ast;
}


//  inline_func_args := '(' inline_func_arg ( ',' inline_func_arg )* ')'

function r_inline_func_args( parser ) {
    var ast = parser.ast( 'inline_func_args' );

    var skipper = parser.set_skipper( 'spaces' );

    parser.token( '(' );

    if ( !parser.is_token( ')' ) ) {
        ast.add( r_inline_func_arg( parser ) );
        while ( parser.is_token( ',' ) ) {
            parser.move_skip( 1 );
            ast.add( r_inline_func_arg( parser ) );
        }
    }

    parser.token( ')' );

    parser.set_skipper( skipper );

    return ast;
}


//  inline_func_arg := inline_expr

function r_inline_func_arg( parser ) {
    var ast = parser.ast( 'inline_func_arg' );

    ast.value = r_inline_expr( parser );

    return ast;
}


//  #### JPath
//  ---------------------------------------------------------------------------------------------------------------  //

//  jpath := '/'? jpath_steps

function r_jpath( parser, params ) {
    var ast = parser.ast( 'jpath' );

    var skipper = parser.set_skipper( 'none' );

    if ( params && params.in_context ) {
        //  in_context означает, что это не полный jpath. Например, в выражении foo[42].bar это [42].bar.
        ast.in_context = true;

        if ( !( parser.is_token( '.' ) || parser.is_token( '[' ) ) ) {
            parser.error( {
                id: 'TOKENS_EXPECTED',
                tokens: [ '.', '[' ],
                msg:  'Expected . or ['
            } );
        }

        ast.steps = r_jpath_steps( parser );

    } else if ( parser.is_token( 'self' ) ) {
        parser.move_x( 1 );

    } else if ( parser.is_token( 'root' ) ) {
        ast.abs = true;
        parser.move_x( 1 );

    } else if ( parser.is_token( '.' ) ) {
        ast.steps = r_jpath_steps( parser );

    } else if ( parser.is_token( '/' ) ) {
        ast.abs = true;
        parser.move_x( 1 );

        ast.steps = r_jpath_steps( parser );

    } else {
        //  Полный jpath всегда должен начинаться с точки или слэша.
        parser.error( {
            id: 'TOKENS_EXPECTED',
            tokens: [ '.', '/' ],
            msg:  'Expected . or /'
        } );
    }

    parser.set_skipper( skipper );

    return ast;
}


//  jpath_steps := ( jpath_nametest | jpath_predicate )*

function r_jpath_steps( parser ) {
    var ast = parser.ast( 'jpath_steps' );

    var r;
    while ( true ) {
        if ( parser.is_token( '.' ) ) {
            r = r_jpath_nametest( parser );
        } else if ( parser.is_token( '[' ) ) {
            r = r_jpath_predicate( parser );
        } else {
            break;
        }

        ast.add( r );
    }

    return ast;
}


//  jpath_nametest := '.' ( QNAME | '*' )

function r_jpath_nametest( parser ) {
    var ast = parser.ast( 'jpath_nametest' );

    //  Тут всегда '.'.
    parser.move_x( 1 );
    ast.name = parser.any_token( 'jstep', '*' );

    return ast;
}


//  jpath_predicate := '[' inline_expr ']'

function r_jpath_predicate( parser ) {
    var ast = parser.ast( 'jpath_predicate' );

    var skipper = parser.set_skipper( 'spaces' );

    //  Тут всегда должна быть '['.
    parser.move_skip( 1 );
    ast.expr = r_inline_expr( parser );

    parser.set_skipper( skipper );
    parser.token( ']' );

    return ast;
}


//  ### Misc
//  ---------------------------------------------------------------------------------------------------------------  //

function match_type( parser ) {
    var id = parser.is_token( 'id' );

    if ( id ) {
        switch ( id ) {
            case 'Null':
            case 'String':
            case 'Number':
            case 'Bool':
            case 'Object':
            case 'Array':
            case 'Json':
            case 'Xml':
            case 'Attr':
                parser.move_skip( id.length );

                return id.toLowerCase();
        }
    }

    parser.error( 'TYPE_NAME_REQUIRED' );
}

//  ## Skippers
//  ---------------------------------------------------------------------------------------------------------------  //


//  ---------------------------------------------------------------------------------------------------------------  //

skippers.none = null;

skippers.spaces = function( parser ) {
    var line = parser.line;
    var x = parser.x;
    var l = parser.l;

    if ( x >= l || line.charCodeAt( x ) !== 32 ) {
        return;
    }

    var i = x + 1;
    while ( i < l && line.charCodeAt( i ) === 32 ) {
        i++;
    }

    parser.x = i;
};


//  ## Compile tokens
//  ---------------------------------------------------------------------------------------------------------------  //

function compile_token( token ) {
    //  Компилируем токен-строку в функцию. Например, '+=' в:
    //
    //      function( parser ) {
    //          var line = parser.line;
    //          var x = parser.x;
    //
    //          if ( x + 2 > parser.l ) {
    //              return null;
    //          }
    //
    //          if ( !( line.charCodeAt( x ) === 43 && line.charCodeAt( x + 1 ) === 61 ) ) {
    //              return null;
    //          }
    //
    //          return '+=';
    //      }
    //
    var js = 'var line=parser.line,x=parser.x;';
    js += 'if(x+' + token.length + '>parser.l)return null;';
    js += 'if(!(' + compile_token_to_js_expr( token ) + '))return null;';
    js += 'return ' + JSON.stringify( token ) + ';';

    return Function( 'parser', js );
}

function compile_keyword( keyword ) {
    //  Компилируем keyword в функцию. Например, для 'if':
    //
    //      function( parser ) {
    //          var x = parser.x;
    //          var p = x + 2;
    //          var l = parser.l;
    //
    //          if ( p > l ) {
    //              return null;
    //          }
    //
    //          var line = parser.line;
    //
    //          if ( !( line.charCodeAt( x ) === 105 && line.charCodeAt( x + 1 ) === 102 ) ) {
    //              return null;
    //          }
    //
    //          if ( p < l ) {
    //              //  Смотрим, нет ли за найденной строкой чего-нибудь из [a-zA-Z0-9_-].
    //              var c = line.charCodeAt( p );
    //              if ( ( c > 64 && c < 91 ) || ( c > 96 && c < 123 ) || ( c > 47 && c < 58 ) || c === 95 || c === 45 ) {
    //                  return null;
    //              }
    //          }
    //
    //          return 'if';
    //      }
    //

    var l = keyword.length;

    var js = 'var x=parser.x,p=x+' + l + ',l=parser.l;';
    js += 'if(p>l)return null;';
    js += 'var line=parser.line;';
    js += 'if(!(' + compile_token_to_js_expr( keyword ) + '))return null;';
    js += 'if(p<l){';
    js += 'var c=line.charCodeAt(p);';
    js += 'if((c>64&&c<91)||(c>96&&c<123)||(c>47&&c<58)||c===95||c===45)return null;';
    js += '}';
    js += 'return ' + JSON.stringify( keyword ) + ';';

    return Function( 'parser', js );
}

//  Возвращаем js-ное выражение, проверяющее, что в строке в текущей позиции
//  находится заданная подстрока. Например, для '+=' вернется строка:
//
//      'line.charCodeAt( x ) === 43 && line.charCodeAt( x + 1 ) === 61'
//
function compile_token_to_js_expr( token ) {
    var js = 'line.charCodeAt(x)===' + token.charCodeAt( 0 );

    for ( var i = 1, l = token.length; i < l; i++ ) {
        js += '&&line.charCodeAt(x+' + i +')===' + token.charCodeAt( i );
    }

    return js;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  ## Export public rules
//
rules.module = r_module;
rules.inline_string = r_inline_string;

//  ---------------------------------------------------------------------------------------------------------------  //

