var Grammar = require( './grammar.js' );

//  # Grammar
//  ---------------------------------------------------------------------------------------------------------------  //

var grammar = {};



//  ## Keywords
//  ---------------------------------------------------------------------------------------------------------------  //

grammar.keywords = [
    'if',
    'else if',
    'else',
    'for',
    'with',
    'func',
];



//  ## Tokens
//  ---------------------------------------------------------------------------------------------------------------  //

var tokens = grammar.tokens = {
    ID: /^[a-zA-Z_][a-zA-Z0-9_-]*/,
    JSTEP: /^[a-zA-Z0-9_][a-zA-Z0-9_-]*/,
    ESC: /^["'\\nt]/,
    NUMBER: /^[0-9]+(\.[0-9]+)?/,
    '|': /^\|(?!\|)/,
    '=': /^=(?!=)/,
    ATTR_END: function( parser ) {
        var char = parser.next_char();

        return ( char === ' ' || char === '\t' || char === '=' || char === '.' || char === '#' );
    },
    EOL: function( parser ) {
        return ( parser.line === '' );
    },
    TAG_START: function( parser ) {
        var code = parser.next_code();

        return ( code <= 90 && code >= 65 );
    }
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
    '@', '#',
    ':',
    '!', '?',
    '\\',
    '...', '@..', '$..',
].forEach( function( s ) {
    tokens[ s ] = s;
} );



//  ## Rules
//  ---------------------------------------------------------------------------------------------------------------  //

var rules = grammar.rules = {};


//  ### Module, block, body
//  ---------------------------------------------------------------------------------------------------------------  //

//  module := ( def_template | def_var | def_func )*

rules.module = function( parser ) {
    var ast = parser.ast( 'module' );

    parser.set_skipper( 'spaces' );

    while ( !parser.is_eof() ) {
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

//  ---------------------------------------------------------------------------------------------------------------  //

//  body := EOL block | inline_expr

rules.body = function( parser ) {
    if ( parser.is_eol() ) {
        parser.eol();

        return parser.match( 'block' );
    } else {
        var expr = parser.match( 'inline_expr' );
        parser.eol();

        return expr;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  block := INDENT ( def_var | expr )* DEDENT

rules.block = function( parser, params ) {
    var ast = parser.ast( 'block' );

    var defs = ast.defs = parser.ast( 'block_defs' );
    var exprs = ast.exprs = parser.ast( 'block_exprs' );

    parser.match_indent();

    //  FIXME: Как-нибудь этот is_eof убрать бы.
    if ( !parser.is_eof() && params && params.args ) {
        var args = ast.args = parser.ast( 'block_args' );

        while ( !parser.is_eof() && parser.is_all_tokens( 'ID', ':' ) ) {
            args.add( parser.match( 'block_arg' ) );
        }
    }

    while ( !parser.is_eof() && !parser.is_dedent() ) {
        //  Пропускаем пустые строки и строчные комментарии.
        if ( parser.is_eol() ) {
            parser.eol();

            continue;
        }

        if ( parser.is_all_tokens( 'ID', '=' ) ) {
            defs.add( parser.match( 'def_var' ) );
        //  TODO: Здесь еще смогут быть определения функций (а может и вложенных шаблонов).
        } else {
            exprs.add( parser.match( 'expr' ) );
        }
    }

    parser.match_dedent();

    return ast;
};

rules.block_arg = function( parser ) {
    var ast = parser.ast( 'block_arg' );

    ast.name = parser.token( 'ID' );
    parser.token( ':' );
    ast.value = parser.match( 'body' );

    return ast;
};


//  ### Declarations
//  ---------------------------------------------------------------------------------------------------------------  //

//  def_template := ID def_template_args? body

rules.def_template = function( parser ) {
    var ast = parser.ast( 'def_template' );

    var name = ast.name = parser.token( 'ID' );
    if ( parser.is_token( '(' ) ) {
        ast.args = parser.match( 'def_template_args' );
    }
    ast.body = parser.match( 'body' );

    //  Запоминаем шаблон, чтобы потом отличать вызовы шаблона от использования переменной.
    parser.add_template( ast );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  def_var := ID '=' expr

rules.def_var = function( parser ) {
    var ast = parser.ast( 'def_var' );

    ast.name = parser.token( 'ID' );
    parser.token( '=' );
    ast.value = parser.match( 'expr' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  def_func := 'func' ID def_func_args body

rules.def_func = function( parser ) {
    var ast = parser.ast( 'def_func' );

    parser.token( 'func' );
    ast.name = parser.token( 'ID' );
    ast.args = parser.match( 'def_func_args' );
    ast.body = parser.match( 'body' );

    return ast;
};

//  def_func_args := '(' ( def_func_arg ( ',' def_func_arg )* )? ')'

rules.def_func_args = function( parser ) {
    var ast = parser.ast( 'def_func_args' );

    parser.token( '(' );
    if ( !parser.is_token( ')' ) ) {
        ast.add( parser.match( 'def_func_arg' ) );
        while ( parser.is_token( ',' ) ) {
            parser.token( ',' );
            ast.add( parser.match( 'def_func_arg' ) );
        }
    }
    parser.token( ')' );

    return ast;
};

//  def_func_arg := ID

rules.def_func_arg = function( parser ) {
    var ast = parser.ast( 'def_func_arg' );

    var type = match_type( parser );
    if ( type ) {
        ast.type = type;
    }
    ast.name = parser.token( 'ID' );
    if ( parser.is_token( '=' ) ) {
        parser.token( '=' );
        ast.default = parser.match( 'inline_expr' );
    }

    return ast;
};



//  ### Block expressions
//  ---------------------------------------------------------------------------------------------------------------  //

//  expr := if | for | with | template | object | array | subexpr | pair | inline_pairs | inline_items | value

rules.expr = function( parser, params ) {
    var content = match_param_content( parser );
    if ( content ) {
        return content;
    }

    var char = parser.next_char();
    switch ( char ) {
        case '{':
            return parser.match( 'object' );
        case '[':
            return parser.match( 'array' );
        case '@':
            return parser.match( 'xml_attr' );
        case '(':
            if ( parser.is_all_tokens( '(', 'EOL' ) ) {
                return parser.match( 'subexpr' );
            }

        /*
        case ':':
            //  TODO: Фильтры (markdown, ...).
        */
    }

    var id = parser.is_token( 'ID' );
    if ( id ) {
        if ( id.toUpperCase() === id ) {
            return parser.match( 'xml' );
        }

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

    var ast;
    if ( expr.id === 'inline_string' && parser.is_token( ':' ) ) {
        parser.token( ':' );

        if ( parser.is_eol() ) {
            parser.eol();

            return parser.ast( 'pair', {
                key: expr,
                value: parser.match( 'block' )
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
        var value = parser.match(
            'expr',
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
        ast = parser.match( 'inline_pairs', pair );

    } else if ( parser.is_token( ',' ) && ( !params || !params.no_items ) ) {
        var item = parser.ast( 'inline_item', expr );
        ast = parser.match( 'inline_items', expr );

    } else {
        ast = parser.ast( 'value', expr );

    }

    if ( !params || !params.no_newline ) {
        parser.eol();
    }

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  if := 'if' inline_expr body ( 'else if' inline_expr body )* ( 'else' body )?

rules.if = function( parser ) {
    var ast = parser.ast( 'if' );

    parser.token( 'if' );

    ast.condition = parser.match( 'inline_expr' );

    ast.then = parser.match( 'body' );

    var elses = ast.elses = parser.ast( 'elses' );

    while ( parser.is_token( 'else if' ) ) {
        elses.add( parser.match( 'else_if' ) );
    }

    if ( parser.is_token( 'else' ) ) {
        elses.add( parser.match( 'else' ) );
    }

    return ast;
};

rules.else_if = function( parser ) {
    var ast = parser.ast( 'else_if' );

    parser.token( 'else if' );
    ast.condition = parser.match( 'inline_expr' );
    ast.body = parser.match( 'body' );

    return ast;
};

rules.else = function( parser ) {
    var ast = parser.ast( 'else' );

    parser.token( 'else' );
    ast.body = parser.match( 'body' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  for := 'for' inline_expr body

rules.for = function( parser ) {
    var ast = parser.ast( 'for' );

    parser.token( 'for' );

    ast.selector = parser.match( 'inline_expr' );
    ast.body = parser.match( 'body' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  with := 'with' inline_expr body

rules.with = function( parser ) {
    var ast = parser.ast( 'with' );

    parser.token( 'with' );

    ast.selector = parser.match( 'inline_expr' );
    ast.body = parser.match( 'body' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  template := ID template_args? ( empty | EOL block | inline_expr )

rules.template = function( parser ) {
    var ast = parser.ast( 'template' );

    ast.name = parser.token( 'ID' );

    if ( parser.is_all_tokens( 'ID', ':' ) ) {
        ast.args = parser.match( 'template_args' );
    }

    ast.content = match_content( parser, { args: true } );

    return ast;
};

//  template_args := template_arg ( ',' template_arg )*

rules.template_args = function( parser ) {
    var ast = parser.ast( 'template_args' );

    ast.add( parser.match( 'template_arg' ) );
    while ( parser.is_token( ',' ) ) {
        parser.token( ',' );
        ast.add( parser.match( 'template_arg' ) );
    }

    return ast;
};


//  template_arg := ID ':' inline_expr

rules.template_arg = function( parser ) {
    var ast = parser.ast( 'template_arg' );

    ast.name = parser.token( 'ID' );
    parser.token( ':' );
    ast.value = parser.match( 'inline_expr' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  object := '{' ( EOL block | inline_pairs ) '}'

rules.object = function( parser ) {
    var ast = parser.ast( 'object' );

    parser.token( '{' );
    if ( parser.is_eol() ) {
        parser.eol();
        ast.body = parser.match( 'block' );
    } else {
        ast.body = parser.match( 'inline_pairs' );
    }
    parser.token( '}' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  array := '[' ( EOL block | inline_items ) ']'

rules.array = function( parser ) {
    var ast = parser.ast( 'array' );

    parser.token( '[' );

    if ( parser.is_eol() ) {
        parser.eol();
        ast.body = parser.match( 'block' );
    } else {
        ast.body = parser.match( 'inline_items' );
    }

    parser.token( ']' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  subexpr := '(' ( EOL block | inline_expr ) ')'

rules.subexpr = function( parser ) {
    parser.token( '(' );

    var ast;
    if ( parser.is_eol() ) {
        parser.eol();

        ast = parser.ast( 'subexpr' );

        ast.body = parser.match( 'block' );
    } else {
        ast = parser.ast( 'inline_subexpr' );

        ast.expr = parser.match( 'inline_expr' );
    }

    parser.token( ')' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_pairs := ( inline_pair ( ',' inline_pair )* )?

rules.inline_pairs = function( parser, pair ) {
    var ast = parser.ast( 'inline_pairs' );

    if ( pair ) {
        ast.add( pair );

    } else {
        if ( parser.is_eol() || parser.is_token( '}' ) ) {
            return ast;
        }

        ast.add( parser.match( 'inline_pair' ) );
    }

    while ( parser.is_token( ',' ) ) {
        parser.token( ',' );
        ast.add( parser.match( 'inline_pair' ) );
    }

    return ast;
};

//  FIXME: Может тут таки должно быть не inline_expr, а inline_string?
//
//  inline_pair := inline_expr ':' inline_expr

rules.inline_pair = function( parser ) {
    var ast = parser.ast( 'inline_pair' );

    ast.key = parser.match( 'inline_expr' );
    parser.token( ':' );
    ast.value = parser.match( 'inline_expr' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_items := inline_item ( ',' inline_item )*

rules.inline_items = function( parser, item ) {
    var ast = parser.ast( 'inline_items' );

    if ( item ) {
        ast.add( item );

    } else {
        if ( parser.is_eol() || parser.is_token( ']' ) ) {
            return ast;
        }

        ast.add( parser.match( 'inline_item' ) );
    }

    while ( parser.is_token( ',' ) ) {
        parser.token( ',' );
        ast.add( parser.match( 'inline_item' ) );
    }

    return ast;
};


//  inline_item := inline_expr

rules.inline_item = function( parser ) {
    var ast = parser.ast( 'inline_item' );

    ast.value = parser.match( 'inline_expr' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  value := inline_expr

rules.value = function( parser ) {
    var ast = parser.ast( 'value' );

    ast.value = parser.match( 'inline_expr' );

    return ast;
};


//  #### XML
//  ---------------------------------------------------------------------------------------------------------------  //

rules.xml = function( parser ) {
    var ast = parser.ast( 'xml' );

    var skipper = parser.set_skipper( 'none' );

    ast.name = parser.token( 'ID' ).toLowerCase();

    var classes = ast.xml_classes = parser.ast( 'xml_classes' );
    var token;
    while (( token = ( parser.is_token( '.' ) || parser.is_token( '#' ) ) )) {
        if ( token === '.' ) {
            classes.add( parser.match( 'xml_class' ) );
        } else {
            ast.xml_id = parser.match( 'xml_id' );
        }
    }

    parser.set_skipper( skipper );

    ast.attrs = parser.match( 'xml_attrs' );

    if ( parser.is_token( 'TAG_START' ) ) {
        ast.content = parser.match( 'xml' );
    } else {
        ast.content = match_content( parser );
    }


    return ast;
};

rules.xml_attrs = function( parser ) {
    var ast = parser.ast( 'xml_attrs' );

    while ( parser.is_token( '@' ) ) {
        ast.add( parser.match( 'xml_attr' ) );
    }

    return ast;
};

rules.xml_attr = function( parser ) {
    var ast = parser.ast( 'xml_attr' );

    var skipper = parser.set_skipper( 'none' );

    parser.token( '@' );
    ast.name = parser.match( 'string_content', { no_esc: true, delim: 'ATTR_END' } );

    parser.set_skipper( skipper );

    parser.token( '=' );
    ast.value = parser.match( 'inline_expr' );

    return ast;
};

rules.xml_class = function( parser ) {
    var ast = parser.ast( 'xml_class' );

    parser.token( '.' );
    ast.value = parser.match( 'string_content', { no_esc: true, delim: 'ATTR_END' } );

    return ast;
};

rules.xml_id = function( parser ) {
    var ast = parser.ast( 'xml_id' );

    parser.token( '#' );
    ast.value = parser.match( 'string_content', { no_esc: true, delim: 'ATTR_END' } );

    return ast;
};

rules.param_content = function( parser ) {
    var ast = parser.ast( 'param_content' );

    parser.token( '...' );

    return ast;
};

rules.param_content_attrs = function( parser ) {
    var ast = parser.ast( 'param_content_attrs' );

    parser.token( '@..' );

    return ast;
};

rules.param_content_other = function( parser ) {
    var ast = parser.ast( 'param_content_other' );

    parser.token( '$..' );

    return ast;
};


//  ### Inline expressions
//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_expr := inline_or

rules.inline_expr = function( parser ) {
    var ast = parser.match( 'inline_ternary' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_ternary := inline_or ( '?' inline_expr ':' inline_expr )?

rules.inline_ternary = function( parser ) {
    var left = parser.match( 'inline_or' );

    if ( parser.is_token( '?' ) ) {
        var ast = parser.ast( 'inline_ternary' );

        ast.condition = left;
        parser.token( '?' );
        ast.then = parser.match( 'inline_expr' );
        parser.token( ':' );
        ast.else = parser.match( 'inline_expr' );

        return ast;
    }

    return left;
};

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

//  inline_unary := ( '+' | '-' ) inline_unary | inline_not

rules.inline_unary = function( parser ) {
    var op = parser.is_token( '+' ) || parser.is_token( '-' );
    if ( op ) {
        var ast = parser.ast( 'inline_unary' );

        ast.op = parser.token( op );
        ast.left = parser.match( 'inline_unary' );

        return ast;
    }

    return parser.match( 'inline_not' );
};

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  inline_primary := inline_number | inline_string | inline_subexpr | inline_var | inline_func | jpath | jpath_filter

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
        expr = parser.match( 'inline_func' );

    } else if ( parser.is_token( 'ID' ) ) {
        expr = parser.match( 'inline_var' );

    } else {
        parser.error( {
            id: 'UNEXPECTED_TOKEN',
            msg: 'number, string, jpath, variable, function call or subexpr expected'
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

//  inline_string := '""' | "''" | '"' string_content '"' | "'" string_content "'"

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

//  string_content := ( string_expr | string_literal )*

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


//  string_expr := '{' inline_expr '}'

rules.string_expr = function( parser ) {
    var ast = parser.ast( 'string_expr' );

    parser.token( '{' );
    parser.skip( 'spaces' );
    ast.expr = parser.match( 'inline_expr' );
    parser.skip( 'spaces' );
    parser.token( '}' );

    return ast;
};

function string_literal( value, parser ) {
    var ast = parser.ast( 'string_literal' );

    ast.value = value;

    return ast;
}

//  ---------------------------------------------------------------------------------------------------------------  //

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

rules.inline_var = function( parser ) {
    var ast = parser.ast( 'inline_var' );

    ast.name = parser.token( 'ID' );

    return ast;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  func := ID inline_func_args

rules.inline_func = function( parser ) {
    var ast = parser.ast( 'inline_func' );

    ast.name = parser.token( 'ID');
    ast.args = parser.match( 'inline_func_args' );

    return ast;
};


//  inline_func_args := '(' inline_func_arg ( ',' inline_func_arg )* ')'

rules.inline_func_args = function( parser ) {
    var ast = parser.ast( 'inline_func_args' );

    parser.token( '(' );

    ast.add( parser.match( 'inline_func_arg' ) );
    while ( parser.is_token( ',' ) ) {
        parser.token( ',' );
        ast.add( parser.match( 'inline_func_arg' ) );
    }

    parser.token( ')' );

    return ast;
};

//  inline_func_arg := inline_expr

rules.inline_func_arg = function( parser ) {
    var ast = parser.ast( 'inline_func_arg' );

    ast.value = parser.match( 'inline_expr' );

    return ast;
};


//  #### JPath
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


//  ### Misc
//  ---------------------------------------------------------------------------------------------------------------  //

function match_content( parser, params ) {
    if ( parser.is_eol() ) {
        parser.eol();

        if ( parser.is_indent() ) {
            return parser.match( 'block', params );
        }
    } else {
        var content = match_param_content( parser ) || parser.match( 'inline_expr' );

        if ( content ) {
            parser.eol();

            return content;
        }
    }

    return null;
};

//  ---------------------------------------------------------------------------------------------------------------  //

function match_param_content( parser ) {
    var chars = parser.next( 3 );

    switch ( chars ) {
        case '...':
            return parser.match( 'param_content' );
        case '@..':
            return parser.match( 'param_content_attrs' );
        case '$..':
            return parser.match( 'param_content_other' );
    }

    return null;
}

//  ---------------------------------------------------------------------------------------------------------------  //

function match_type( parser ) {
    var id = parser.is_token( 'ID' );

    if ( id ) {
        switch ( id ) {
            case 'scalar':
            case 'bool':
            case 'xml':
            case 'attr':
            case 'node':
            case 'object':
            case 'array':
                return parser.token( 'ID' );
        }
    }

    return null;
}

//  ## Skippers
//  ---------------------------------------------------------------------------------------------------------------  //

var skippers = grammar.skippers = {};

//  ---------------------------------------------------------------------------------------------------------------  //

skippers.none = null;

skippers.spaces = /^[ \t]+/;




//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = new Grammar( grammar );

//  ---------------------------------------------------------------------------------------------------------------  //

