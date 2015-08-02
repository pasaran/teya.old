module.exports = function( asts ) {

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module.js = function( ast ) {
    return `
        var no = require( 'nommon' );

        var R = require( 'teya/lib/runtime.js' );
        //  Exports from runtime.
        var to_array = R.to_array;
        var to_string = R.to_string;
        var to_number = R.to_number;
        var to_xml = R.to_xml;
        var copy_attrs = R.copy_attrs;
        var to_tagname = R.to_tagname;
        var attrs = R.attrs;
        var content_attrs = R.content_attrs;
        var is_empty_tag = R.is_empty_tag;
        var string_attr = R.string_attr;
        var xml_attr = R.xml_attr;
        var string_to_attrvalue = R.string_to_attrvalue;
        var xml_to_attrvalue = R.xml_to_attrvalue;

        var I = R.internal_funcs;

        var M = {};
        var T = M.templates = {};
        var V = M.vars = {};

        ${ ast.imports.js() }

        ${ ast.vars.js__define() }
        ${ ast.funcs.js__define() }

        ${ ast.templates.js() }

        M.init = function( xr, x0 ) {
            ${ ast.imports.js__init() }
            ${ ast.vars.js__def() }
            ${ ast.vars.js__export() }
            ${ ast.vars.js__init() }
        }

        M.run = function( xr, id ) {
            var x0 = xr;
            M.init( xr, x0 );

            var a0 = attrs();
            return T[ id ]( xr, x0, a0 );
        };

        module.exports = M;
    `
}

asts.module_vars.js__define = function( ast ) {
    if ( !ast.is_empty() ) {
        return `var ${ ast.js__list() }`
    }

    return '';
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.import.js = function( ast ) {
    var iid = ast.iid;

    if ( ast.is_js ) {
        return `
            var M${ iid } = require( './${ ast.filename }' );
        `
    }

    return `
        var M${ iid } = require( './${ ast.filename }.js' );
        var T${ iid } = M${ iid }.templates;
        var V${ iid } = M${ iid }.vars;
    `
}

asts.import.js__init = function( ast ) {
    if ( !ast.is_js ) {
        return `
            M${ ast.iid }.init( xr, x0 );
        `
    }

    return '';
}

asts.def_imported_template.js = function( ast ) {
    if ( ast.namespace ) {
        return `
            var t_${ ast.normalize_name() } = T${ ast.import.iid }[ '${ ast.shortname }' ];
        `
    }

    return `
        var t_${ ast.normalize_name() } = T[ '${ ast.name }' ] = T${ ast.import.iid }[ '${ ast.shortname }' ];
    `
}


#   ---------------------------------------------------------------------------------------------------------------   #

asts.def_template.js = function( ast ) {
    return `
        //  ${ ast.name }: ${ ast.get_type() }
        function ${ ast.js__template_name() }( ${ ast.js__func_args() } ) {
            ${ ast.args.js__default() }
            ${ ast.js__template_prologue() }
            ${ ast.body.js__output() }
            ${ ast.js__template_epilogue() }
        }
        T[ '${ ast.name }' ] = ${ ast.js__template_name() };
    `
}

asts.def_template.js__template_name = function( ast ) {
    return `t${ ast.tid }_${ ast.normalize_name() }`
}

//  def_template :func_args [ ast.get_type() === 'pair' || ast.get_type() === 'item' ]
//      x%rid, r%rid, content, vars

asts.def_template.js__func_args = function( ast ) {
    return `xr, x${ ast.rid }, a${ ast.aid }, ca, cr${ ast.args.js__template_arg() }`
}

asts.def_template.js__template_prologue = function( ast ) {
    var type = ast.get_type();

    if ( type === 'attr' ) {
        return `//  var a${ ast.aid } = attrs();`

    } else if ( type === 'pair' || type === 'item' ) {
        return '';
    } else {
        return `var r${ ast.rid } = ${ ast.js__default_value() };`
    }
}

def_template :template_epilogue [ ast.get_type() === 'attr' ]

def_template :template_epilogue
    return r%rid;

def_arg :default [ ast.default ]
    if ( %.:var_name == null ) { %.:var_name = %default:cast; }

# def_arg :default
#     if ( %.:var_name == null ) { %.:var_name = %.:default_value; }

def_arg :template_arg
    , %.:var_name

* :var_name
    v%{vid}_%normalize_name()

/*
#   ---------------------------------------------------------------------------------------------------------------   #

def_var :def [ ast.value.is_inline() ]
    //  %name: %get_type()
    var %.:var_name = %value:value;

def_var :def
    %value:prologue
    %value:output
    %.:epilogue

def_var :epilogue [ ast.value.get_type() === 'attr' ]
    //  %name: %get_type()
    var %.:var_name = a%{value.rid};

def_var :epilogue
    //  %name: %get_type()
    var %.:var_name = r%value.rid;

def_var :list
    %.:var_name

def_var :export
    V[ '%name' ] = %.:var_name;

def_var :init [ ast.get_type() === 'module' ]
    %{.:var_name}.init( xr, x0 );

#   ---------------------------------------------------------------------------------------------------------------   #

def_func :define [ ast.is_user && ast.body.is_inline() ]
    //  %get_full_name() : %get_type()
    function %{.:func_name}( xr, x0, a0%args:func_arg ) {
        %args:default
#   FIXME: Возможно, тут должно быть body:cast.
        return %body:value;
    }

def_func :define [ ast.is_user ]
    //  %get_full_name() : %get_type()
    function %{.:func_name}( xr, x0, a0%args:func_arg ) {
        %args:default
        %.:func_prologue
        //  %body.is_inline()
        %body:output
        %.:func_epilogue
    }

def_func :func_name
    f_%{normalize_name()}_%fid

def_func :func_prologue [ ast.get_type() === 'attr' ]
    //  var a%aid = attrs();

def_func :func_prologue [ ast.get_type() === 'pair' || ast.get_type() === 'item' ]

def_func :func_prologue
    var r%rid = %.:default_value;

def_func :func_epilogue [ ast.get_type() === 'attr' ]

def_func :func_epilogue
    return r%rid;

def_arg :func_arg
    , %.:var_name

#   ---------------------------------------------------------------------------------------------------------------   #

block :content
    var r%rid = '', a%rid = content_attrs();
    %.:output

block :value
    %exprs:value

#   ---------------------------------------------------------------------------------------------------------------   #

* :prologue [ ast.get_type() === 'object' ]
    var r%rid = {};

* :prologue [ ast.get_type() === 'array' ]
    var r%rid = [];

* :prologue [ ast.get_type() === 'attr' ]
    var a%aid = attrs();

* :prologue [ ast.get_type() === 'json' ]
    var r%rid;

* :prologue [ ast.get_type() === 'xml' ]
    var r%rid = '', a%aid = attrs();

* :prologue
    var r%rid = '';

#   ---------------------------------------------------------------------------------------------------------------   #

block :output
    %defs:def

    %exprs:output

#   ---------------------------------------------------------------------------------------------------------------   #

import :def
    require( %filename:value )

#   ---------------------------------------------------------------------------------------------------------------   #

if :value [ ast.is_inline() && ast.elses.is_empty() ]
    ( %condition:value ) ? %then.exprs:cast : %.:default_value

if :value [ ast.is_inline() ]
    ( %condition:value ) ? %then.exprs:cast : %elses:cast

if :cast
    %.:value

if :output [ ast.is_inline() ]
    %.:value

if :output
    if ( %condition:value ) %then:if_body %elses:if_body

block :if_body
    {
        %.:output
    }

else_if :if_body
    else if ( %condition:value ) %body:if_body

else :cast
    %body.exprs:cast

else :if_body
    else {
        %body:output
    }

#   ---------------------------------------------------------------------------------------------------------------   #

for :output
    var items%xid = to_array( %selector:value );
    for ( var i%xid = 0, l%xid = items%{xid}.length; i%xid < l%xid; i%xid++ ) {
        var x%body.xid = items%xid[ i%xid ];
        %body:output
    }

#   ---------------------------------------------------------------------------------------------------------------   #

value :cast
    %value:cast

value :value
    %value:value

value :output [ ast.get_type() === 'none' ]
    %value:value;

value :output [ ast.get_type() === 'string' || ast.get_type() === 'xml' ]
    r%rid += %value:cast;

value :output [ ast.get_type() === 'attr' ]
    a%{rid}.copy( %value:value );

value :output [ !ast.to_type ]
#  FIXME: А почему тут было %value:cast?
    r%rid = %value:value;

value :output
    r%rid += %value:cast;

#   ---------------------------------------------------------------------------------------------------------------   #

template :name
    t%{def.tid}_%{normalize_name()}

template :output [ ast.def.get_type() === 'attr' ]
    %params:template_param_def
    %content:content
    %.:name( xr, %.:context, a%aid, a%content.rid, r%content.rid%params:template_param_value );

template :output [ ast.def.get_type() === 'string' || ast.def.get_type() === 'xml' ]
    %params:template_param_def
    //  %def.get_type()
    %content:content
    r%rid += %.:name( xr, %.:context, a%aid, a%content.rid, r%content.rid%params:template_param_value );

template :output
    %params:template_param_def
    //  %def.get_type()
    %content:content
    r%rid = %.:name( xr, %.:context, a%aid, a%content.rid, r%content.rid%params:template_param_value );

template :context [ ast.context ]
    %context:value

template :context
    x%xid

* :template_param_def [ ast.value && !ast.is_inline() ]
    //  %value.get_type()
    %value:prologue
    %value:output
    %.:template_param_epilogue

* :template_param_epilogue [ ast.value.get_type() === 'attr' ]
    //  %name: %get_type()
    var %.:param_name = a%{value.rid};

* :template_param_epilogue
    //  %name: %get_type()
    var %.:param_name = r%value.rid;

template_param :template_param_value [ ast.value && ast.value.is_inline() ]
    , %value:cast

template_param :template_param_value [ ast.value ]
    , %.:param_name

template_param :template_param_value
    , null

* :param_name
    z%{rid}_%normalize_name()

#   ---------------------------------------------------------------------------------------------------------------   #

subexpr :output
    %body:output

#   ---------------------------------------------------------------------------------------------------------------   #

jpath :value [ ast.abs && !ast.steps ]
    xr

jpath :value [ !ast.steps ]
    x%xid

jpath :value [ ast.abs ]
    no.jpath( '%teya()', xr )

jpath :value
    no.jpath( '%teya()', x%xid )

#   ---------------------------------------------------------------------------------------------------------------   #

inline_binop :cast
    %left:cast %op %right:cast

inline_binop :value
    %left:value %op %right:value

inline_unop :value
    %op%left:value

inline_ternary :value
    ( %condition:value ) ? %then:value : %else:value

inline_number :value
    %value

inline_subexpr :value
    ( %expr:value )

#   ---------------------------------------------------------------------------------------------------------------   #

inline_string :cast
    %value:cast

inline_string :value
    %value:cast

string_literal :name
    %stringify()

string_literal :cast
    %.:value

string_literal :value
    '%stringify()'

string_expr :value
    %expr:cast

#   ---------------------------------------------------------------------------------------------------------------   #

inline_var :value
    %def:var_name

#   ---------------------------------------------------------------------------------------------------------------   #

inline_func :value [ ast.def.is_external ]
    M%{def.parent.parent.iid}.%name( %args )

inline_func :value [ ast.def.is_user && ast.args.is_empty() ]
    %{.:func_name}( xr, x%xid, a%aid )

# FIXME. Сделать отдельный шаблон для параметров и ставить запятую там.
inline_func :value [ ast.def.is_user ]
    %{.:func_name}( xr, x%xid, a%aid, %args )

inline_func :value [ ast.def.is_internal ]
    %.:internal

inline_func :func_name
    f_%{def.normalize_name()}_%def.fid

inline_func_arg
    %value:cast

#   ---------------------------------------------------------------------------------------------------------------   #

inline_func :internal [ ast.name === 'log' ]
    console.log( %args )

inline_func :internal [ ast.name === 'slice' ]
    I.slice( %args )

#   ---------------------------------------------------------------------------------------------------------------   #

true :value
    true

false :value
    false

#   ---------------------------------------------------------------------------------------------------------------   #
*/

asts.object.js__output = function( ast ) {
    return ast.body.js__output()
}

asts.object.js__value = function( ast ) {
    if ( ast.body.is_inline() ) {
        return `[ ${ ast.body.js__value() } ]`
    }
}

asts.inline_object.js__value = function( ast ) {
    return `[ ${ ast.body.js__value() } ]`
}

asts.inline_pair.js__output = function( ast ) {
    if ( ast.value.is_inline() ) {
        return `
            r${ ast.rid }[ ${ ast.key.js__value() } ] = ${ ast.value.js__value() };
        `
    }
}

asts.pair.js__output = function( ast ) {
    return `
        ${ ast.value.js__prologue() }
        ${ ast.value.js__output() }
        r${ ast.rid }[ ${ ast.key.js__value() } ] = r${ ast.value.rid };
    `
}

asts.pair.js__value = function( ast ) {
    return `
        ${ ast.key.js__value() }: ${ ast.value.js__value() }
    `
}

asts.inline_pair.js__value = function( ast ) {
    return `
        ${ ast.key.js__value() }: ${ ast.value.js__value() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.array.js__output = function( ast ) {
    return ast.body.js__output()
}

asts.array.js__value = function( ast ) {
    if ( ast.body.is_inline() ) {
        return `[ ${ ast.body.js__value() } ]`
    }
}

asts.inline_array.js__value = function( ast ) {
    return `[ ${ ast.body.js__value() } ]`
}

asts.inline_item.js__value = function( ast ) {
    return ast.value.js__value()
}

//  FIXME: Хочется иметь один push на все item'ы.
//  Сейчас это невозможно сделать из-за текущей реализации шаблонов.
//
asts.inline_item.js__output = function( ast ) {
    return `
        r${ ast.rid }.push( ${ ast.value.js__value() } );
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml.js__output = function( ast ) {
    return `
        ${ ast.js__start() }
        ${ ast.content.js__output() }
        ${ ast.js__end() }
    `
}

asts.xml.js__start = function( ast ) {
    var is_const = ast.name.is_const();
    var starts_with_attr = ast.content.starts_with_attr();

    if ( is_const ) {
        if ( starts_with_attr !== false ) {
            var name = ast.name.js__name();

            return `
                r${ ast.rid } += '<${ name }';
                a%aid = attrs( '${ name }', {
                    ${ ast.attrs.js__output() }
                } );
            `
        }

        return `
            r${ ast.rid } += ${ ast.js__static_name() };
        `
    }

    if ( starts_with_attr !== false ) {
        var nid = ast.nid;

        return `
            var n${ nid } = to_tagname( %name:cast );
            r${ ast.rid } += '<' + n${ nid };
            a${ ast.aid } = attrs( n${ nid }, {
                ${ ast.attrs.js__output() }
            } );
        `
    }

    return `
        var n${ ast.nid } = to_tagname( ${ ast.name.js__cast() } );
        r${ ast.rid } += ${ ast.js__dynamic_name() };
    `
}

asts.xml.js__close_start_tag = function( ast ) {
    return ( ast.is_empty_tag ) ? '/>' : '>'
}

asts.xml.js__static_name = function( ast ) {
    if ( ast.attrs.is_empty() ) {
        return `
            '<${ ast.name.js__name() }${ ast.js__close_start_tag() }'
        `
    }

    return `
        '<${ ast.name.js__name() }' + ${ ast.attrs.js__inline() } + '${ ast.js__close_start_tag() }'
    `
}

asts.xml.js__dynamic_name = function( ast ) {
    var nid = ast.nid;

    if ( ast.attrs.is_empty() ) {
        return `
            '<' + n${ nid } + ( is_empty_tag( n${ nid } ) ? '/>' : '>' )
        `
    }

    return `
        '<' + n${ nid } + ${ ast.attrs.js__inline() } + ( is_empty_tag( n${ nid } ) ? '/>' : '>' )
    `
}

asts.xml.js__end = function( ast ) {
    if ( ast.name.is_const() ) {
        if ( ast.is_empty_tag ) {

        } else {
            return `
                r${ ast.rid } += '</${ ast.name.js__name() }>';
            `
        }
    }

    var nid = ast.nid;

    return `
        if ( !is_empty_tag( n${ nid } ) ) {
            r${ ast.rid } += '</' + n${ nid } + '>';
        }
    `
}

asts.xml_attr.js__inline = function( ast ) {
    if ( ast.value.get_type() === 'xml' ) {
        return `
            " ${ ast.name }='" + xml_to_attrvalue( ${ ast.value.js__cast() } ) + "'"
        `
    }

    return `
        " ${ ast.name }='" + string_to_attrvalue( ${ ast.value.js__cast() } ) + "'"
    `
}

asts.xml_attr.js__output = function( ast ) {
    if ( ast.value.get_type() === 'xml' ) {
        //  FIXME: Тут, видимо, должно быть %value:cast?
        return `
            '${ ast.name }': xml_attr( ${ ast.value.js__value() } )
        `
    }

    //  FIXME: Тут, видимо, должно быть %value:cast?
    return `
        '${ ast.name }': string_attr( ${ ast.value.js__value() } )
    `
}

asts.close_attrs.js__output = function( ast ) {
    var rid = ast.rid;

    return `
        r${ rid } += a${ rid }.close();
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.attr.js__output = function( ast ) {
    if ( ast.value.get_cast_type() === 'json' ) {
        //  FIXME: Или тут нужно `ast.value.js__cast()`?
        return `
            a${ ast.rid }.set_xml( '${ ast.name.js__cast() }', JSON.stringify( ${ ast.value.js__value() } ) );
        `
    }

    var type = ast.value.get_type();
    var is_inline = ast.value.is_inline;

    if ( is_inline ) {
        if ( type === 'xml' ) {
            if ( ast.op === '+=' ) {
                return `
                    a${ ast.rid }.add_xml( '${ ast.name.js__cast() }', ${ ast.value.js__cast() } );
                `
            }

            return `
                a${ ast.rid }.set_xml( '${ ast.name.js__cast() }', ${ ast.value.js__cast() } );
            `
        }

        if ( ast.op === '+=' ) {
            return `
                a${ ast.rid }.add_string( '${ ast.name.js__cast() }', ${ ast.value.js__cast() } );
            `
        }

        return `
            a${ ast.rid }.set_string( '${ ast.name.js__cast()', ${ ast.value.js__cast() } );
        `
    }

    return `
        ${ ast.value.js__prologue() }
        ${ ast.value.js__output() }
        ${ ast.js__epilogue() }
    `
}

asts.attr.js__epilogue = function( ast ) {
    //  attr :epilogue [ ast.value.get_type() === 'attr' ]
    //      //  @%name: %value.get_type()
    //      var %.:var_name = a%{value.rid};

    return `
        //  @${ ast.name }: ${ ast.value.get_type() }
        a${ ast.rid }.set_string( '${ ast.name.js__cast() }', r${ ast.value.rid } );
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content.js__output = function( ast ) {
    var rid = ast.rid;

    return `
        a${ rid }.merge( ca );
        r${ rid } += a${ rid }.close() + cr;
    `
}

asts.param_content_attrs.js__output = function( ast ) {
    return `
        a${ ast.rid }.merge( ca );
    `
}

asts.param_content_other.js__output = function( ast ) {
    var rid = ast.rid;

    return `
        r${ rid } += a${ rid }.close() + cr;
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.ast.js__default_value = function( ast ) {
    switch ( ast.get_cast_type() ) {
        case 'number':
            return '0'

        case 'boolean':
            return 'false'

        case 'object':
            return '{}'

        case 'array':
            return '[]'

        case 'json':
            return 'null'

        default:
            return "''"
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_expr.js__cast = function( ast ) {
    var from = ast.from;
    var to = ast.to;

    var value = ast.value.js();

    if ( to === 'any' ) {
        return value
    }

    if ( from === 'xml' && to === 'string' ) {
        return value
    }

    if ( to === 'string' || to === 'xml' || to === 'number' || from === 'json') {
        return `to_${ to }( ${ value } )`
    }

    if ( from && to ) {
        return `${ from }_to_${ to }( ${ value } )
    }

    return value
}

