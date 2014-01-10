var Scope = require( './scope.js' );

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
    '!',
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

        var id = parser.token( 'ID' );

        var def;

        if ( id === 'func' ) {
            //  Это определение функции.
            def = parser.ast( 'def_func', ast );

            def.name = id;
            def.args = parser.match( 'func_args', def );
            def.body = parser.match( 'body', def );


        } else if ( parser.is_token( '=' ) ) {
            //  Это определение глобальной переменной.
            def = parser.ast( 'def_var', ast );

            def.name = id;
            parser.token( '=' );
            def.value = parser.match( 'body', def );

        } else {
            //  Это определение шаблона.
            def = parser.ast( 'def_template', ast );

            def.name = id;

            if ( parser.is_token( '(' ) ) {
                def.args = parser.match( 'template_args', def );
            }

            def.body = parser.match( 'body', def );

        }

        ast.add( def );
        ast.scope.add_def( def );

        parser.move_y();
    }

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

rules.expr = function( parser, parent ) {
    if ( parser.is_indent() ) {
        return parser.match( 'block', parent );
    }

    /*
    var chars = parser.next( 2 );

    switch ( chars ) {
        case '..':
            return parser.match( 'content_all', parent );
        case '@.':
            return parser.match( 'content_attrs', parent );
        case '$.':
            return parser.match( 'content_other', parent );
    }
    */

    var char = parser.next( 1 );

    switch ( char ) {
        case '{':
            return parser.match( 'object', parent );
        case '[':
            return parser.match( 'array', parent );
        /*
        case '"':
        case "'":
            return parser.match( 'inline_string', parent );
        */
        case '@':
            return parser.match( 'xml_attr', parent );
        case '(':
            return parser.match( 'subexpr', parent );
        case '/':
        case '.':
            //  FIXME: '...'
            return parser.match( 'jpath', parent );
        case ':':
            //  TODO: Фильтры (markdown, ...).
    }

    var id = parser.is_token( 'ID' );
    if ( id ) {

        switch ( id ) {
            case 'if':
                return parser.match( 'if', parent );
            case 'for':
                return parser.match( 'for', parent );
            case 'with':
                return parser.match( 'with', parent );
            case 'when':
                return parser.match( 'when', parent );
        }

        //  FIXME: Если после id идет ':', то это pair, если '=', то это def_var.

        var scope = parent.scope;
        if ( scope.is_var( id ) ) {
            return parser.match( 'var', parent );
        }
        if ( scope.is_func( id ) ) {
            return parser.match( 'func', parent );
        }
        if ( scope.is_template( id ) ) {
            return parser.match( 'template', parent );
        }

        //  FIXME: Тут может быть items.

    }

    return parser.match( 'value', parent );
};

rules.if = function( parser, parent ) {
    var ast = parser.ast( 'if', parent );

    parser.token( 'if' );
    ast.condition = parser.match( 'inline_expr', ast );
    ast.then = parser.match( 'body', ast );
    if ( parser.is_token( 'else' ) ) {
        ast.else = parser.match( 'body', ast );
    }

    return ast;
};

rules.for = function( parser, parent ) {
    var ast = parser.ast( 'for', parent );

    parser.token( 'for' );
    ast.selector = parser.match( 'inline_expr', ast );
    ast.body = parser.match( 'expr', ast );

    return ast;
};

rules.with = function( parser, parent ) {
    var ast = parser.ast( 'with', parent );

    parser.token( 'with' );
    ast.selector = parser.match( 'inline_expr', ast );
    ast.body = parser.match( 'expr', ast );

    return ast;
};

rules.body = function( parser, parent ) {
    if ( parser.is_eol() ) {
        parser.match_eol();

        return parser.match( 'block', parent );
    } else {
        return parser.match( 'inline_expr', parent );
    }
};

rules.block = function( parser, parent ) {
    var ast = parser.ast( 'block', parent );
    ast.scope = new Scope( ast.scope );

    parser.match_indent();

    while ( !parser.is_eof() && !parser.is_dedent() ) {
        //  Пропускаем пустые строки и строчные комментарии.
        if ( parser.is_eol() || parser.next( 2 ) === '//' ) {
            parser.move_y();

            continue;
        }

        //  FIXME: Тут могут быть определения переменных.

        ast.add( parser.match( 'expr', ast ) );
    }

    parser.match_dedent();

    return ast;
};

rules.object = function( parser, parent ) {
    var ast = parser.ast( 'object', parent );

    parser.token( '{' );
    ast.body = parser.match( 'block', ast );
    parser.token( '}' );

    return ast;
};

rules.array = function( parser, parent ) {
    var ast = parser.ast( 'array', parent );

    parser.token( '[' );
    ast.body = parser.match( 'block', ast );
    parser.token( ']' );

    return ast;
};

rules.value = function( parser, parent ) {
    var ast = parser.ast( 'value', parent );

    ast.value = parser.match( 'inline_expr', ast );

    return ast;
};


//  ---------------------------------------------------------------------------------------------------------------  //
//  JPath
//  ---------------------------------------------------------------------------------------------------------------  //

//  jpath := '/'? jpath_steps

rules.jpath = function( parser, parent, params ) {
    params = params || {};

    var ast = parser.ast( 'jpath', parent );

    var skipper = parser.set_skipper( 'none' );

    if ( params.in_context ) {
        //  in_context означает, что это не полный jpath. Например, в выражении foo[42].bar это [42].bar.
        ast.in_context = true;
    } else {
        if ( !( parser.is_token( '.' ) || parser.is_token( '/' ) ) ) {
            //  Полный jpath всегда должен начинаться с точки или слэша.
            parser.error( 'Expected . or /' );
        }
    }

    //  jpath может начинаться с /, но это должен быть полный jpath, не в контексте.
    if ( !ast.in_context && parser.is_token( '/' ) ) {
        parser.token( '/' );
        ast.abs = true;
    } else if ( !( parser.is_token( '.' ) || parser.is_token( '[' ) ) ) {
        parser.error( 'Expected: . or [' );
    }
    ast.steps = parser.match( 'jpath_steps', ast );

    parser.set_skipper( skipper );

    return ast;
};

//  jpath_steps := ( jpath_nametest | jpath_predicate )*

rules.jpath_steps = function( parser, parent ) {
    var ast = parser.ast( 'jpath_steps', parent );

    var r;
    while ( true ) {
        if ( parser.is_token( '.' ) ) {
            r = parser.match( 'jpath_nametest', ast );
        } else if ( parser.is_token( '[' ) ) {
            r = parser.match( 'jpath_predicate', ast );
        } else {
            break;
        }

        ast.add( r );
    }

    return ast;
};

//  jpath_nametest := '.' ( QNAME | '*' )

rules.jpath_nametest = function( parser, parent ) {
    var ast = parser.ast( 'jpath_nametest', parent );

    parser.token( '.' );
    ast.name = parser.is_any_token( 'JSTEP', '*' );

    return ast;
};

//  jpath_predicate := '[' inline_expr ']'

rules.jpath_predicate = function( parser, parent ) {
    var ast = parser.ast( 'jpath_predicate', parent );

    var skipper = parser.set_skipper( 'spaces' );

    parser.token( '[' );
    ast.expr = parser.match( 'inline_expr', ast );
    parser.token( ']' );

    parser.set_skipper( skipper );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_expr := inline_or

rules.inline_expr = function( parser, parent ) {
    var skipper = parser.set_skipper( 'spaces' );

    var ast = parser.match( 'inline_or' );

    parser.set_skipper( skipper );

    return ast;
};

//  inline_or := inline_and ( '||' inline_or )?

rules.inline_or = function( parser, parent ) {
    var left = parser.match( 'inline_and', parent );

    if ( parser.is_token( '||' ) ) {
        var ast = parser.ast( 'inline_or', parent );

        ast.left = left;
        ast.op = parser.token( '||' );
        ast.right = parser.match( 'inline_or', parent );

        return ast;
    }

    return left;
};

//  inline_and := inline_eq ( '&&' inline_and )?

rules.inline_and = function( parser, parent ) {
    var left = parser.match( 'inline_eq', parent );

    if ( parser.is_token( '&&' ) ) {
        var ast = parser.ast( 'inline_and', parent );

        ast.left = left;
        ast.op = parser.token( '&&' );
        ast.right = parser.match( 'inline_and', parent );

        return ast;
    }

    return left;
};

//  inline_eq := inline_rel ( ( '==' | '!=' ) inline_rel )?

rules.inline_eq = function( parser, parent ) {
    var left = parser.match( 'inline_rel', parent );

    var op;
    if (( op = parser.is_token( '==' ) || parser.is_token( '!=' ) )) {
        var ast = parser.ast( 'inline_eq', parent );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_rel', parent);

        return ast;
    }

    return left;
};

//  inline_rel := inline_add ( ( '<=' | '<' | '>=' | '>' ) inline_add )?

rules.inline_rel = function( parser, parent ) {
    var left = parser.match( 'inline_add', parent );

    var op;
    if (( op = parser.is_token( '<=' ) || parser.is_token( '<' ) || parser.is_token( '>=' ) || parser.is_token( '>' ) )) {
        var ast = parser.ast( 'inline_rel', parent );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_add', parent );

        return ast;
    }

    return left;
};

//  inline_add := inline_mul ( ( '+' | '-' ) inline_add )?

rules.inline_add = function( parser, parent ) {
    var left = parser.match( 'inline_mul', parent );

    var op;
    if (( op = parser.is_token( '+' ) || parser.is_token( '-' ) )) {
        var ast = parser.ast( 'inline_add', parent );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_add', parent );

        return ast;
    }

    return left;
};

//  inline_mul := inline_unary ( ( '/' | '*' | '%' ) inline_mul )?

rules.inline_mul = function( parser, parent ) {
    var left = parser.match( 'inline_unary', parent );

    var op;
    if (( op = parser.is_token( '/' ) || parser.is_token( '*' ) || parser.is_token( '%' ) )) {
        var ast = parser.ast( 'inline_add', parent );

        ast.left = left;
        ast.op = parser.token( op );
        ast.right = parser.match( 'inline_mul', parent );

        return ast;
    }

    return left;
};

//  inline_unary := '-' inline_not | inline_not

rules.inline_unary = function( parser, parent ) {
    if ( parser.is_token( '-' ) ) {
        var ast = parser.ast( 'inline_unary', parent );

        ast.op = parser.token( '-' );
        ast.left = parser.match( 'inline_not', parent );

        return ast;
    }

    return parser.match( 'inline_not', parent );
};

//  inline_not := '!' inline_union | inline_union

rules.inline_not = function( parser, parent ) {
    if ( parser.is_token( '!' ) ) {
        var ast = parser.ast( 'inline_unary', parent );

        ast.op = parser.token( '!' );
        ast.left = parser.match( 'inline_not', parent );

        return ast;
    }

    return parser.match( 'inline_union', parent );
};

//  inline_union := inline_primary ( '|' inline_union )?

rules.inline_union = function( parser, parent ) {
    var left = parser.match( 'inline_primary', parent );

    if ( parser.is_token( '|' ) ) {
        var ast = parser.ast( 'inline_union', parent );

        ast.left = left;
        ast.op = parser.token( '|' );
        ast.right = parser.match( 'inline_union', parent );

        return ast;
    }

    return left;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_primary := inline_number | inline_string | inline_subexpr | jpath | inline_function | inline_var

rules.inline_primary = function( parser, parent ) {
    var skipper = parser.set_skipper( 'none' );

    if ( parser.is_token( 'NUMBER' ) ) {
        return parser.match( 'inline_number', parent );
    }

    if ( parser.is_token( '"' ) || parser.is_token( "'" ) ) {
        return parser.match( 'inline_string', parent );
    }

    var expr;

    if ( parser.is_token( '(' ) ) {
        expr = parser.match( 'inline_subexpr', parent );

    } else if ( parser.is_token( '.' ) || parser.is_token( '/' ) ) {
        expr = parser.match( 'jpath', parent );

    } else if ( parser.is_all_tokens( 'ID', '(' ) ) {
        expr = parser.match( 'func', parent );

    } else if ( parser.is_token( 'ID' ) ) {
        expr = parser.match( 'var', parent );

    } else {
        parser.error( 'number, string, jpath, variable or function call expected' );

    }

    if ( parser.is_token( '[' ) || parser.is_token( '.' ) ) {
        var filter = parser.ast( 'jpath_filter', parent );

        filter.expr = expr;
        filter.jpath = parser.match( 'jpath', parent, { in_context: true } );

        expr = filter;
    }

    parser.set_skipper( skipper );

    return expr;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_number := NUMBER

rules.inline_number = function( parser, parent ) {
    var ast = parser.ast( 'inline_number', parent );

    ast.value = parseFloat( parser.token( 'NUMBER' ) );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_string := '"' string_content '"'

rules.inline_string = function( parser, parent, params ) {
    params = params || {};

    var ast = parser.ast( 'inline_string', parent );

    var skipper = parser.set_skipper( 'none' );

    var quote = parser.is_any_token( '"', "'" );
    //  FIXME: Зачем тут этот отдельный случай?
    //  Почему string_content не работает с пустой строкой?
    if ( parser.is_token( quote ) ) {
        //  Отдельно обрабатываем пустую строку.
        ast.value = string_literal( '', parser, ast );

    } else {
        ast.value = parser.match(
            'string_content',
            parent,
            {
                noexpr: params.noexpr,
                noesc: params.noesc,
                delim: quote
            }
        );

    }

    parser.token( quote );

    parser.set_skipper( skipper );

    return ast;
};

//  string_content := ...

//  params.noexpr   -- запрещает интерполяцию выражений в строке.
//  params.noesc    -- не нужно учитывать esc-последовательности типа \n, \t и т.д.
//  params.delim    -- задает символ, ограничивающий строковый контент.
rules.string_content = function( parser, parent, params ) {
    params = params || {};

    var ast = parser.ast( 'string_content', parent );

    var s = '';

    var delim = params.delim;
    var noexpr = params.noexpr;
    var noesc = params.noesc;

    while ( !parser.is_eol() && !parser.is_token( delim ) ) {
        if ( !noexpr && parser.is_token( '{' ) || parser.is_token( '}' ) ) {
            if ( parser.is_token( '{{' ) ) {
                parser.token( '{{' );
                s += '{';

            } else if ( parser.is_token( '}}' ) ) {
                parser.token( '}}' );
                s += '}';

            } else if ( parser.is_token( '{' ) ) {
                if ( s ) {
                    ast.add( string_literal( s, parser, ast ) );
                    s = '';
                }

                parser.token( '{' );
                parser.skip( 'spaces' );

                //  FIXME: parser.match( 'string_expr', ast )
                var expr = parser.ast( 'string_expr', ast );
                expr.expr = parser.match( 'inline_expr', expr );

                ast.add( expr );

                parser.skip( 'spaces' );
                parser.token( '}' );

            } else {
                parser.error( 'Unmatched }' );

            }

        } else if ( !noesc && parser.is_token( '\\' ) ) {
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
            s += parser.next( 1 );
            parser.move_x( 1 );
        }
    }

    if ( s ) {
        ast.add( string_literal( s, parser, ast ) );
    }

    return ast;
};

function string_literal( value, parser, parent ) {
    var ast = parser.ast( 'string_literal', parent );

    ast.value = value;

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_subexpr := '(' inline_expr ')'

rules.inline_subexpr = function( parser, parent ) {
    var ast = parser.ast( 'inline_subexpr', parent );

    parser.token( '(' );
    ast.expr = parser.match( 'inline_expr', ast );
    parser.token( ')' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  var := ID

rules.var = function( parser, parent ) {
    var ast = parser.ast( 'var', parent );

    ast.name = parser.token( 'ID' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  func := ID callargs ( '->' expr )?

rules.func = function( parser, parent ) {
    var ast = parser.ast( 'func', parent );

    ast.name = parser.token( 'ID');
    ast.args = parser.match( 'callargs', ast );

    if ( parser.is_token( '->' ) ) {
        parser.token( '->' );
        ast.context = parser.match( 'expr', ast );
    }

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  callargs := '(' callarg ( ',' callarg )* ')'

rules.callargs = function( parser, parent ) {
    var ast = parser.ast( 'callargs', parent );

    parser.token( '(' );

    ast.add( parser.match( 'callarg', ast ) );
    while ( parser.is_token( ',' ) ) {
        parser.token( ',' );
        ast.add( parser.match( 'callarg', ast ) );
    }

    parser.token( ')' );

    return ast;
};

//  callarg := expr

rules.callarg = function( parser, parent ) {
    var ast = parser.ast( 'callarg', parent );

    ast.value = parser.match( 'expr', ast );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var skippers = grammar.skippers = {};

//  ---------------------------------------------------------------------------------------------------------------  //

skippers.none = function() {};

skippers.spaces = /^[ \t]+/;

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = grammar;

//  ---------------------------------------------------------------------------------------------------------------  //


