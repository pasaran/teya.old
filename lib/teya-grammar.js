var Grammar = require( './grammar.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var grammar = {};

//  ---------------------------------------------------------------------------------------------------------------  //

grammar.keywords = [
    'if',
    'else',
    'else if',
    'for',
    'with',
    'func',
];

//  ---------------------------------------------------------------------------------------------------------------  //

var tokens = grammar.tokens = {
    ID: /^[a-zA-Z_][a-zA-Z0-9_-]*/,
    JSTEP: /^[a-zA-Z0-9_][a-zA-Z0-9_-]*/,
    ESC: /^["'\\nt]/,
    NUMBER: /^[0-9]+(\.[0-9]+)?/,
    '|': /^\|(?!\|)/,
    '=': /^=(?!=)/,
};

[
    '{', '}',
    '[', ']',
    '(', ')',
    '{{', '}}',
    '"', "'",
    '+', '-', '*', '/', '%',
    '||', '&&',
    '==', '===', '!=', '!==',
    '<=', '<', '>=', '>',
    '.', ',',
    ':',
    '!', '?',
    '\\',
].forEach( function( s ) {
    tokens[ s ] = s;
} );

//  ---------------------------------------------------------------------------------------------------------------  //

var rules = grammar.rules = {};

//  ---------------------------------------------------------------------------------------------------------------  //

rules.module = function( parser ) {
    var ast = parser.ast( 'module' );

    parser.set_skipper( 'spaces' );

    while ( !parser.is_eof() ) {
        //  Пропускаем пустые строки и строчные комментарии.
        if ( parser.is_eol() || parser.next( 2 ) === '//' ) {
            parser.move_y();

            continue;
        }

        var def;

        if ( parser.is_token( 'func' ) ) {
            def = parser.match( 'def_func' );
        //  TODO: Если в синтаксисе добавить ключевое слово для шаблона,
        //  то не придется делать тут lookahead дальше одного токена.
        //
        } else if ( parser.is_all_tokens( 'ID', '=' ) ) {
            def = parser.match( 'def_var' );
        } else {
            def = parser.match( 'def_template' );
        }

        ast.add( def );
    }

    return ast;
};

rules.def_template = function( parser ) {
    var ast = parser.ast( 'def_template' );

    var name = ast.name = parser.token( 'ID' );
    if ( parser.is_token( '(' ) ) {
        ast.args = parser.match( 'template_args' );
    }
    ast.body = parser.match( 'body' );

    //  Запоминаем шаблон, чтобы потом отличать вызовы шаблона от использования переменной.
    parser.add_template( ast );

    return ast;
};

rules.def_var = function( parser ) {
    var ast = parser.ast( 'def_var' );

    ast.name = parser.token( 'ID' );
    parser.token( '=' );
    ast.value = parser.match( 'expr' );

    return ast;
};

rules.def_func = function( parser ) {
    var ast = parser.ast( 'def_func' );

    parser.token( 'func' );
    ast.name = parser.token( 'ID' );
    ast.args = parser.match( 'func_args' );
    ast.body = parser.match( 'body' );

    return ast;
};

rules.func_args = function( parser ) {
    var ast = parser.ast( 'func_args' );

    parser.token( '(' );
    if ( !parser.is_token( ')' ) ) {
        ast.add( parser.match( 'func_arg' ) );
        while ( parser.is_token( ',' ) ) {
            parser.token( ',' );
            ast.add( parser.match( 'func_arg' ) );
        }
    }
    parser.token( ')' );

    return ast;
};

rules.func_arg = function( parser ) {
    var ast = parser.ast( 'func_arg' );

    //  FIXME: type.
    ast.name = parser.token( 'ID' );
    //  FIXME: default.

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

rules.expr = function( parser, params ) {
    /*
    //  FIXME: Кажется, это не нужно. Блок не может быть просто выражением.
    //  Он должен быть частью чего-либо.
    //
    if ( parser.is_indent() ) {
        return parser.match( 'block' );
    }
    */

    /*
    var chars = parser.next( 2 );
    switch ( chars ) {
        case '..':
            return parser.match( 'content_all' );
        case '@.':
            return parser.match( 'content_attrs' );
        case '$.':
            return parser.match( 'content_other' );
    }
    */

    var char = parser.next_char();
    switch ( char ) {
        case '{':
            return parser.match( 'object' );
        case '[':
            return parser.match( 'array' );
        case '@':
            return parser.match( 'xml_attr' );
        case '(':
            //  FIXME: Сделать parser.is_all_tokens( '(', 'EOL' ) ).
            var pos = parser.get_pos();
            parser.token( '(' );
            var is_block = parser.is_eol();
            parser.set_pos( pos );

            if ( is_block ) {
                return parser.match( 'subexpr' );
            }

        case ':':
            //  TODO: Фильтры (markdown, ...).
    }

    var id = parser.is_token( 'ID' );
    if ( id ) {
        switch ( id ) {
            case 'if':
                return parser.match( 'if' );
            case 'for':
                return parser.match( 'for' );
            case 'with':
                return parser.match( 'with' );
        }

        if ( parser.is_template( id ) ) {
            return parser.match( 'template' );
        }
    }

    var expr = parser.match( 'inline_expr' );

    if ( parser.is_token( ':' ) ) {
        parser.token( ':' );

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
        //  не нужно требовать перевод строки.
        //
        var value = parser.match(
            'expr',
            {
                no_items: true,
                no_newline: true
            }
        );

        if ( value.id === 'value' ) {
            //  В `value` у нас инлайновое выражение, значит генерим `inline_pairs`.

            var pairs = parser.ast( 'inline_pairs' );

            var pair = parser.ast( 'inline_pair' );
            pair.key = expr;
            //  Распаковываем value.
            pair.value = value.value;
            pairs.add( pair );

            while ( parser.is_token( ',' ) ) {
                parser.token( ',' );
                pairs.add( parser.match( 'inline_pair' ) );
            }

            if ( !params || !params.no_newline ) {
                parser.match_eol();
            }

            return pairs;

        } else {
            var pair = parser.ast( 'pair' );
            pair.key = expr;
            pair.value = value;

            return pair;
        }

    } else if ( parser.is_token( ',' ) && ( !params || !params.no_items ) ) {
        var items = parser.ast( 'inline_items' );

        var item = parser.ast( 'inline_item' );
        item.value = expr;
        items.add( item );

        while ( parser.is_token( ',' ) ) {
            parser.token( ',' );

            item = parser.match( 'inline_item' );
            items.add( item );
        }

        if ( !params || !params.no_newline ) {
            parser.match_eol();
        }

        return items;

    } else if ( parser.is_token( '?' ) ) {
        var ternary = parser.ast( 'inline_ternary' );

        parser.token( '?' );

        ternary.condition = expr;
        ternary.then = parser.match( 'inline_expr' );
        parser.token( ':' );
        ternary.else = parser.match( 'inline_expr' );

        if ( !params || !params.no_newline ) {
            parser.match_eol();
        }

        return ternary;

    } else {
        var value = parser.ast( 'value' );

        value.value = expr;

        if ( !params || !params.no_newline ) {
            parser.match_eol();
        }

        return value;

    }
};

rules.if = function( parser ) {
    var ast = parser.ast( 'if' );

    parser.token( 'if' );

    ast.condition = parser.match( 'inline_expr' );

    ast.then = parser.match( 'body' );

    if ( parser.is_token( 'else' ) ) {
        parser.token( 'else' );
        ast.else = parser.match( 'body' );
    }

    return ast;
};

rules.for = function( parser ) {
    var ast = parser.ast( 'for' );

    parser.token( 'for' );

    ast.selector = parser.match( 'inline_expr' );
    ast.body = parser.match( 'expr' );

    return ast;
};

rules.with = function( parser ) {
    var ast = parser.ast( 'with' );

    parser.token( 'with' );

    ast.selector = parser.match( 'inline_expr' );
    ast.body = parser.match( 'body' );

    return ast;
};

rules.body = function( parser ) {
    if ( parser.is_eol() ) {
        parser.match_eol();

        return parser.match( 'block' );
    } else {
        return parser.match( 'inline_expr' );
    }
};

rules.block = function( parser ) {
    var ast = parser.ast( 'block' );

    parser.match_indent();

    while ( !parser.is_eof() && !parser.is_dedent() ) {
        //  Пропускаем пустые строки и строчные комментарии.
        if ( parser.is_eol() || parser.next( 2 ) === '//' ) {
            parser.move_y();

            continue;
        }

        if ( parser.is_all_tokens( 'ID', '=' ) ) {
            ast.add( parser.match( 'def_var' ) );
        //  TODO: Здесь еще смогут быть определения функций (а может и вложенных шаблонов).
        } else {
            ast.add( parser.match( 'expr' ) );
        }
    }

    parser.match_dedent();

    return ast;
};

rules.object = function( parser ) {
    var ast = parser.ast( 'object' );

    parser.token( '{' );
    if ( parser.is_eol() ) {
        parser.match_eol();
        ast.body = parser.match( 'block' );
    } else {
        ast.body = parser.match( 'inline_pairs' );
    }
    parser.token( '}' );

    return ast;
};

rules.inline_pairs = function( parser ) {
    var ast = parser.ast( 'inline_pairs' );

    if ( !parser.is_token( '}' ) ) {
        ast.add( parser.match( 'inline_pair' ) );

        while ( parser.is_token( ',' ) ) {
            parser.token( ',' );
            ast.add( parser.match( 'inline_pair' ) );
        }
    }

    return ast;
};

rules.inline_pair = function( parser ) {
    var ast = parser.ast( 'inline_pair' );

    ast.key = parser.match( 'inline_expr' );
    parser.token( ':' );
    ast.value = parser.match( 'inline_expr' );

    return ast;
};

rules.array = function( parser ) {
    var ast = parser.ast( 'array' );

    parser.token( '[' );

    if ( parser.is_eol() ) {
        parser.match_eol();
        ast.body = parser.match( 'block' );
    } else {
        ast.body = parser.match( 'inline_items' );
    }

    parser.token( ']' );

    return ast;
};

rules.inline_items = function( parser ) {
    var ast = parser.ast( 'inline_items' );

    if ( !( parser.is_eol() || parser.is_token( ']' ) ) ) {
        ast.add( parser.match( 'inline_item' ) );

        while ( parser.is_token( ',' ) ) {
            parser.token( ',' );
            ast.add( parser.match( 'inline_item' ) );
        }
    }

    return ast;
};

rules.inline_item = function( parser ) {
    var ast = parser.ast( 'inline_item' );

    ast.value = parser.match( 'inline_expr' );

    return ast;
};

rules.value = function( parser ) {
    var ast = parser.ast( 'value' );

    ast.value = parser.match( 'inline_expr' );

    return ast;
};


//  ---------------------------------------------------------------------------------------------------------------  //
//  JPath
//  ---------------------------------------------------------------------------------------------------------------  //

//  jpath := '/'? jpath_steps

rules.jpath = function( parser, params ) {
    var ast = parser.ast( 'jpath' );

    var skipper = parser.set_skipper( 'none' );

    if ( params && params.in_context ) {
        //  in_context означает, что это не полный jpath. Например, в выражении foo[42].bar это [42].bar.
        ast.in_context = true;
    } else {
        if ( !( parser.is_token( '.' ) || parser.is_token( '/' ) ) ) {
            //  Полный jpath всегда должен начинаться с точки или слэша.
            parser.error( {
                id: 'TOKENS_EXPECTED',
                tokens: [ '.', '/' ],
                msg:  'Expected . or /'
            } );
        }
    }

    //  jpath может начинаться с /, но это должен быть полный jpath, не в контексте.
    if ( !ast.in_context && parser.is_token( '/' ) ) {
        parser.token( '/' );
        ast.abs = true;
    } else if ( !( parser.is_token( '.' ) || parser.is_token( '[' ) ) ) {
        parser.error( {
            id: 'TOKENS_EXPECTED',
            tokens: [ '.', '[' ],
            msg:  'Expected . or ['
        } );
    }
    ast.steps = parser.match( 'jpath_steps' );

    parser.set_skipper( skipper );

    return ast;
};

//  jpath_steps := ( jpath_nametest | jpath_predicate )*

rules.jpath_steps = function( parser ) {
    var ast = parser.ast( 'jpath_steps' );

    var r;
    while ( true ) {
        if ( parser.is_token( '.' ) ) {
            r = parser.match( 'jpath_nametest' );
        } else if ( parser.is_token( '[' ) ) {
            r = parser.match( 'jpath_predicate' );
        } else {
            break;
        }

        ast.add( r );
    }

    return ast;
};

//  jpath_nametest := '.' ( QNAME | '*' )

rules.jpath_nametest = function( parser ) {
    var ast = parser.ast( 'jpath_nametest' );

    parser.token( '.' );
    ast.name = parser.is_any_token( 'JSTEP', '*' );

    return ast;
};

//  jpath_predicate := '[' inline_expr ']'

rules.jpath_predicate = function( parser ) {
    var ast = parser.ast( 'jpath_predicate' );

    var skipper = parser.set_skipper( 'spaces' );

    parser.token( '[' );
    ast.expr = parser.match( 'inline_expr' );
    parser.token( ']' );

    parser.set_skipper( skipper );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_expr := inline_or

rules.inline_expr = function( parser ) {
    var ast = parser.match( 'inline_or' );

    return ast;
};

//  inline_or := inline_and ( '||' inline_or )?

rules.inline_or = function( parser ) {
    var left = parser.match( 'inline_and' );

    if ( parser.is_token( '||' ) ) {
        var ast = parser.ast( 'inline_or' );

        ast.left = left;
        ast.op = parser.token( '||' );
        ast.right = parser.match( 'inline_or' );

        return ast;
    }

    return left;
};

//  inline_and := inline_eq ( '&&' inline_and )?

rules.inline_and = function( parser ) {
    var left = parser.match( 'inline_eq' );

    if ( parser.is_token( '&&' ) ) {
        var ast = parser.ast( 'inline_and' );

        ast.left = left;
        ast.op = parser.token( '&&' );
        ast.right = parser.match( 'inline_and' );

        return ast;
    }

    return left;
};

//  inline_eq := inline_rel ( ( '===' | '==' | '!==' | '!=' ) inline_rel )?

rules.inline_eq = function( parser ) {
    var left = parser.match( 'inline_rel' );

    var op = parser.is_token( '===' ) || parser.is_token( '==' ) || parser.is_token( '!==' ) || parser.is_token( '!=' );
    if ( op ) {
        var ast = parser.ast( 'inline_eq' );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_rel' );

        return ast;
    }

    return left;
};

//  inline_rel := inline_add ( ( '<=' | '<' | '>=' | '>' ) inline_add )?

rules.inline_rel = function( parser ) {
    var left = parser.match( 'inline_add' );

    var op = parser.is_token( '<=' ) || parser.is_token( '<' ) || parser.is_token( '>=' ) || parser.is_token( '>' );
    if ( op ) {
        var ast = parser.ast( 'inline_rel' );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_add' );

        return ast;
    }

    return left;
};

//  inline_add := inline_mul ( ( '+' | '-' ) inline_add )?

rules.inline_add = function( parser ) {
    var left = parser.match( 'inline_mul' );

    var op = parser.is_token( '+' ) || parser.is_token( '-' );
    if ( op ) {
        var ast = parser.ast( 'inline_add' );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_add' );

        return ast;
    }

    return left;
};

//  inline_mul := inline_unary ( ( '/' | '*' | '%' ) inline_mul )?

rules.inline_mul = function( parser ) {
    var left = parser.match( 'inline_unary' );

    var op = parser.is_token( '/' ) || parser.is_token( '*' ) || parser.is_token( '%' );
    if ( op ) {
        var ast = parser.ast( 'inline_add' );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_mul' );

        return ast;
    }

    return left;
};

//  inline_unary := '-' inline_not | inline_not

rules.inline_unary = function( parser ) {
    if ( parser.is_token( '-' ) ) {
        var ast = parser.ast( 'inline_unary' );

        ast.op = parser.token( '-' );
        ast.left = parser.match( 'inline_not' );

        return ast;
    }

    return parser.match( 'inline_not' );
};

//  inline_not := '!' inline_union | inline_union

rules.inline_not = function( parser ) {
    if ( parser.is_token( '!' ) ) {
        var ast = parser.ast( 'inline_unary' );

        ast.op = parser.token( '!' );
        ast.left = parser.match( 'inline_not' );

        return ast;
    }

    return parser.match( 'inline_union' );
};

//  inline_union := inline_primary ( '|' inline_union )?

rules.inline_union = function( parser ) {
    var left = parser.match( 'inline_primary' );

    if ( parser.is_token( '|' ) ) {
        var ast = parser.ast( 'inline_union' );

        ast.left = left;
        ast.op = parser.token( '|' );
        ast.right = parser.match( 'inline_union' );

        return ast;
    }

    return left;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_primary := inline_number | inline_string | inline_subexpr | jpath | inline_function | inline_var

rules.inline_primary = function( parser ) {
    var skipper = parser.set_skipper( 'none' );

    var expr;
    if ( parser.is_token( 'NUMBER' ) ) {
        expr = parser.match( 'inline_number' );

    } else if ( parser.is_token( '"' ) || parser.is_token( "'" ) ) {
        expr = parser.match( 'inline_string' );

    } else if ( parser.is_token( '(' ) ) {
        expr = parser.match( 'inline_subexpr' );

    } else if ( parser.is_token( '.' ) || parser.is_token( '/' ) ) {
        expr = parser.match( 'jpath' );

    } else if ( parser.is_all_tokens( 'ID', '(' ) ) {
        expr = parser.match( 'func' );

    } else if ( parser.is_token( 'ID' ) ) {
        expr = parser.match( 'var' );

    } else {
        parser.error( {
            id: 'UNEXPECTED_TOKEN',
            msg: 'number, string, jpath, variable or function call expected'
        } );

    }

    if ( parser.is_token( '[' ) || parser.is_token( '.' ) ) {
        var filter = parser.ast( 'jpath_filter' );

        filter.expr = expr;
        filter.jpath = parser.match( 'jpath', { in_context: true } );

        expr = filter;
    }

    parser.set_skipper( skipper );

    return expr;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_number := NUMBER

rules.inline_number = function( parser ) {
    var ast = parser.ast( 'inline_number' );

    ast.value = parseFloat( parser.token( 'NUMBER' ) );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_string := '"' string_content '"'

rules.inline_string = function( parser, params ) {
    var ast = parser.ast( 'inline_string' );

    var skipper = parser.set_skipper( 'none' );

    var quote = parser.is_any_token( '"', "'" );

    if ( parser.is_token( quote ) ) {
        //  Отдельно обрабатываем пустую строку.
        ast.value = string_literal( '', parser );

    } else {
        ast.value = parser.match(
            'string_content',
            {
                no_expr: params && params.no_expr,
                no_esc: params && params.no_esc,
                delim: quote
            }
        );

    }

    parser.token( quote );

    parser.set_skipper( skipper );

    return ast;
};

//  string_content := ...

//  params.no_expr  -- запрещает интерполяцию выражений в строке.
//  params.no_esc   -- не нужно учитывать esc-последовательности типа \n, \t и т.д.
//  params.delim    -- задает символ, ограничивающий строковый контент.
rules.string_content = function( parser, params ) {
    var ast = parser.ast( 'string_content' );

    var delim, no_expr, no_esc;
    if ( params ) {
        delim = params.delim;
        no_expr = params.no_expr;
        no_esc = params.no_esc;
    }

    var s = '';

    while ( !parser.is_eol() && !parser.is_token( delim ) ) {
        if ( !no_expr && parser.is_token( '{' ) || parser.is_token( '}' ) ) {
            if ( parser.is_token( '{{' ) ) {
                parser.token( '{{' );
                s += '{';

            } else if ( parser.is_token( '}}' ) ) {
                parser.token( '}}' );
                s += '}';

            } else if ( parser.is_token( '{' ) ) {
                if ( s ) {
                    ast.add( string_literal( s, parser ) );
                    s = '';
                }

                ast.add( parser.match( 'string_expr' ) );

            } else {
                parser.error( {
                    id: 'UNMATCHED_TOKEN',
                    token: '}',
                    msg: 'Unmatched }'
                } );

            }

        } else if ( !no_esc && parser.is_token( '\\' ) ) {
            parser.token( '\\' );

            if ( parser.is_token( 'ESC' ) ) {
                var c = parser.token( 'ESC' );

                switch ( c ) {
                    case 'n':
                        s += '\n';
                        break;

                    case 't':
                        s += '\t';
                        break;

                    default:
                        s += c;
                }
            }

        } else {
            s += parser.next_char();
            parser.move_x( 1 );
        }
    }

    if ( s ) {
        ast.add( string_literal( s, parser ) );
    }

    return ast;
};

rules.string_expr = function( parser ) {
    var ast = parser.ast( 'string_expr' );

    var skipper = parser.set_skipper( 'spaces' );

    parser.token( '{' );
    ast.expr = parser.match( 'inline_expr' );
    parser.token( '}' );

    parser.set_skipper( skipper );

    return ast;
};

function string_literal( value, parser ) {
    var ast = parser.ast( 'string_literal' );

    ast.value = value;

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  subexpr := '(' EOL body ')'

rules.subexpr = function( parser ) {
    parser.token( '(' );

    var ast;
    if ( parser.is_eol() ) {
        parser.match_eol();

        ast = parser.ast( 'subexpr' );

        ast.body = parser.match( 'block' );
    } else {
        ast = parser.ast( 'inline_subexpr' );

        ast.expr = parser.match( 'inline_expr' );
    }

    parser.token( ')' );

    return ast;
};

//  inline_subexpr := '(' inline_expr ')'

rules.inline_subexpr = function( parser ) {
    var ast = parser.ast( 'inline_subexpr' );

    //  FIXME: А кто выставляет none так, что тут приходится его переопределять?
    var skipper = parser.set_skipper( 'spaces' );

    parser.token( '(' );
    ast.expr = parser.match( 'inline_expr' );
    parser.token( ')' );

    parser.set_skipper( skipper );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  var := ID

rules.var = function( parser ) {
    var ast = parser.ast( 'var' );

    ast.name = parser.token( 'ID' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  func := ID callargs ( '->' expr )?

rules.func = function( parser ) {
    var ast = parser.ast( 'func' );

    ast.name = parser.token( 'ID');
    ast.args = parser.match( 'callargs' );

    if ( parser.is_token( '->' ) ) {
        parser.token( '->' );
        ast.context = parser.match( 'expr' );
    }

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  callargs := '(' callarg ( ',' callarg )* ')'

rules.callargs = function( parser ) {
    var ast = parser.ast( 'callargs' );

    parser.token( '(' );

    ast.add( parser.match( 'callarg' ) );
    while ( parser.is_token( ',' ) ) {
        parser.token( ',' );
        ast.add( parser.match( 'callarg' ) );
    }

    parser.token( ')' );

    return ast;
};

//  callarg := expr

rules.callarg = function( parser ) {
    var ast = parser.ast( 'callarg' );

    ast.value = parser.match( 'expr' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var skippers = grammar.skippers = {};

//  ---------------------------------------------------------------------------------------------------------------  //

skippers.none = null;

skippers.spaces = /^[ \t]+/;

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = new Grammar( grammar );

//  ---------------------------------------------------------------------------------------------------------------  //

