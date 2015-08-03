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

//  ---------------------------------------------------------------------------------------------------------------  //

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

asts.def_template.js__template_epilogue = function() {
    if ( this.get_type() === 'attr' ) {

    } else {
        return `return r${ this.rid };`
    }
}

asts.def_arg.js__default = function() {
    if ( this.default ) {
        return `
            if ( ${ this.js__var_name() } == null ) { ${ this.js__var_name() } = ${ this.default.js__cast() }; }
        `
    }

    //  if ( %.:var_name == null ) { %.:var_name = %.:default_value; }
}

asts.def_arg.js__template_arg = function() {
    return `, ${ this.js__var_name() }`
}

asts.ast.js__var_name = function() {
    return `v${ this.vid }_${ this.normalize_name() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_var.js__def = function() {
    var value = this.value;

    if ( value.is_inline() ) {
        return `
            //  ${ this.name }: ${ this.get_type() }
            var ${ this.js__var_name() } = ${ value.js__value() };
        `
    }

    return `
        ${ value.js__prologue() }
        ${ value.js__output() }
        ${ this.js__epilogue() }
    `
}

asts.def_var.js__epilogue = function() {
    var value = this.value;

    if ( value.get_type() === 'attr' ) {
        return `
            //  ${ this.name }: ${ this.get_type() }
            var ${ this.js__var_name() } = a${ value.rid };
        `
    }

    return `
        //  ${ this.name }: ${ this.get_type() }
        var ${ this.js__var_name() } = r${ value.rid };
    `
}

asts.def_var.js__list = function() {
    return this.js__var_name()
}

asts.def_var.js__export = function() {
    return `V[ '${ this.name }' ] = ${ this.js__var_name() };`
}

asts.def_var.js__init = function() {
    if ( this.get_type() === 'module' ) {
        return `
            ${ this.js__var_name() }.init( xr, x0 );
        `
    }

    return ''
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_func.js__define = function() {
    if ( this.is_user ) {
        if ( this.body.is_inline() ) {
            //  FIXME: Возможно, тут должно быть body:cast.
            return `
                //  ${ this.get_full_name() } : ${ this.get_type() }
                function ${ this.js__func_name() }( xr, x0, a0${ this.args.js__func_arg() } ) {
                    ${ this.args.js__default() }
                    return ${ this.body.js__value() };
                }
            `
        }

        return `
            //  ${ this.get_full_name() } : ${ this.get_type() }
            function ${ this.js__func_name() }( xr, x0, a0${ args.js__func_arg() } ) {
                ${ this.args.js__default() }
                ${ this.js__func_prologue() }
                ${ this.body.js__output() }
                ${ this.js__func_epilogue() }
            }
        `
    }
}

asts.def_func.js__func_name = function() {
    return `f_${ this.normalize_name() }_${ this.fid }`
}

asts.def_func.js__func_prologue = function() {
    var type = this.get_type();

    if ( type === 'attr' ) {
        //  var a%aid = attrs();
    } else if ( type === 'pair' || type === 'item' ) {

    } else {
        return `
            var r${ this.rid } = ${ this.js__default_value() };
        `
    }
}

asts.def_func.js__func_epilogue = function() {
    var type = this.get_type();

    if ( type === 'attr' ) {

    } else {
        return `
            return r${ this.rid };
        `
    }
}

asts.def_arg.js__func_arg = function() {
    return `, ${ this.js__var_name() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block.js__content = function() {
    var rid = this.rid;

    return `
        var r${ rid } = '', a${ rid } = content_attrs();
        ${ this.js__output() }
    `
}

asts.block.js__value = function() {
    return this.exprs.js__value()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.ast.js__prologue = function() {
    switch ( this.get_type() ) {
        case 'object':
            return `var r${ this.rid } = {};`

        case 'array':
            return `var r${ this.rid } = [];`

        case 'attr':
            return `var a${ this.aid } = attrs();`

        case 'json':
            return `var r${ this.rid };`

        case 'xml':
            return `var r${ this.rid } = '', a${ this.aid } = attrs();`

        default:
            return `var r${ this.rid } = '';`
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block.js__output = function() {
    return `
        ${ this.defs.js__def() }

        ${ this.exprs.js__output() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.import.js__def = function() {
    return `require( ${ this.filename.js__value() } )`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.if.js__value = function() {
    if ( this.is_inline() ) {
        if ( this.elses.is_empty() ) {
            return `( ${ this.condition.js__value() } ) ? ${ this.then.exprs.js__cast() } : ${ this.js__default_value() }`
        }

        return `( ${ this.condition.js__value() } ) ? ${ this.then.exprs.js__cast() } : ${ this.elses.js__case() }`
    }
}

asts.if.js__cast = function() {
    return this.js__value()
}

asts.if.js__output = function() {
    if ( ast.is_inline() ) {
        return this.js__value()
    }

    return `
        if ( ${ this.condition.js__value() } ) ${ this.then.js__if_body() } ${ this.elses.js__if_body() }
    `
}

asts.block.js__if_body = function() {
    return `
        {
            ${ this.js__output() }
        }
    `
}

asts.else_if.js__if_body = function() {
    return `
        else if ( ${ this.condition.js__value() } ) ${ this.body.js__if_body() }
    `
}

asts.else.js__if_body = function() {
    return `
        else {
            ${ this.body.js__output() }
        }
    `
}

asts.else.js__cast = function() {
    return this.body.exprs.js__cast()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.for.js__output = function() {
    var xid = this.xid;
    return `
        var items${ xid } = to_array( ${ this.selector.js__value() } );
        for ( var i${ xid } = 0, l${ xid } = items${ xid }.length; i${ xid } < l${ xid }; i${ xid }++ ) {
            var x${ this.body.xid } = items${ xid }[ i${ xid } ];
            ${ this.body.js__output() }
        }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.value.js__cast = function( ast ) {
    return ast.value.js__cast()
}

asts.value.js__value = function() {
    return this.value.js__value()
}

asts.value.js__output = function() {
    var type = this.get_type();

    if ( type === 'none' ) {
        return `${ this.value.js__value() };`
    }

    if ( type === 'string' || type === 'xml' ) {
        return `r${ this.rid } += ${ this.value.js__cast() };`
    }

    if ( type === 'attr' ) {
        return `a${ this.rid }.copy( ${ this.value.js__value() } );`
    }

    if ( !ast.to_type ) {
        //  FIXME: А почему тут было %value:cast?
        return `r${ this.rid } = ${ this.value.js__value() };`
    }

    return `r${ this.rid } += ${ this.value.js__cast() };`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template.js__name = function( ast ) {
    return `t${ ast.def.tid }_${ ast.normalize_name() }`
}

asts.template.js__output = function( ast ) {
    var type = ast.def.get_type();

    var params = ast.params;
    var content = ast.content;
    var content_rid = content.rid;

    if ( type === 'attr' ) {
        return `
            ${ params.js__template_param_def() }
            //  ${ type }
            ${ content.js__content() }
            ${ ast.js__name() }( xr, ${ ast.js__context() }, a${ ast.aid }, a${ content_rid }, r${ content_rid }${ params.js__template_param_value() } );
        `
    }

    if ( type === 'string' || type === 'xml' ) {
        return `
            ${ params.js__template_param_def() }
            //  ${ type }
            ${ content.js__content() }
            r${ ast.rid } += ${ ast.js__name() }( xr, ${ ast.js__context() }, a${ ast.aid }, a${ content_rid }, r${ content_rid }${ params.js__template_param_value() } );
        `
    }

    return `
        ${ params.js__template_param_def() }
        //  ${ type }
        ${ content.js__content() }
        r${ ast.rid } = ${ ast.js__name() }( xr, ${ ast.js__context() }, a${ ast.aid }, a${ content_rid }, r${ content_rid }${ params.js__template_param_value() } );
    `
}

asts.template.js__context = function( ast ) {
    if ( ast.context ) {
        return ast.context.js__value()
    }

    return `x${ ast.xid }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.ast.js__template_param_def = function( ast ) {
    var value = ast.value;

    if ( value && !ast.is_inline() ) {
        return `
            //  ${ value.get_type() }
            ${ value.js__prologue() }
            ${ value.js__output() }
            ${ ast.js__template_param_epilogue() }
        `
    }
}

asts.ast.js__template_param_epilogue = function( ast ) {
    var value = ast.value;

    if ( value.get_type() === 'attr' ) {
        return `
            //  ${ ast.name }: ${ ast.get_type() }
            var ${ ast.js__param_name() } = a${ value.rid };
        `
    }

    return `
        //  ${ ast.name }: ${ ast.get_type() }
        var ${ ast.js__param_name() } = r${ value.rid };
    `
}

asts.template_param.js__template_param_value = function( ast ) {
    var value = ast.value;

    if ( value ) {
        if ( value.is_inline() ) {
            return `, ${ value.js__cast() }`
        }

        return `, ${ ast.js__param_name() }`
    }

    return ', null'
}

asts.ast.js__param_name = function( ast ) {
    return `z${ ast.rid }_${ ast.normalize_name() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.subexpr.js__output = function( ast ) {
    return ast.body.js__output()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath.js__value = function( ast ) {
    if ( ast.abs ) {
        if ( !ast.steps ) {
            return 'xr'
        }

        return `no.jpath( '${ ast.teya() }', xr )`
    }

    if ( !ast.steps ) {
        return `x${ ast.xid }`
    }

    return `no.jpath( '${ ast.teya() }', x${ xid } )`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_binop.js__cast = function( ast ) {
    return `${ ast.left.js__cast() } ${ ast.op } ${ ast.right.js__cast() }`
}

asts.inline_binop.js__value = function( ast ) {
    return `${ ast.left.js__value() } ${ ast.op } ${ ast.right.js__value() }`
}

asts.inline_unop.js__value = function( ast ) {
    return `${ ast.op }${ ast.left.js__value() }`
}

asts.inline_ternary.js__value = function( ast ) {
    return `( ${ ast.condition.js__value() } ) ? ${ ast.then.js__value() } : ${ ast.else.js__value() }`
}

asts.inline_number.js__value = function( ast ) {
    return ast.value
}

asts.inline_subexpr.js__value = function( ast ) {
    return `( ${ ast.expr.js__value() } )`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_string.js__cast = function( ast ) {
    return ast.value.js__cast()
}

asts.inline_string.js__value = function( ast ) {
    return ast.value.js__cast()
}

asts.string_literal.js__name = function( ast ) {
    return ast.stringify()
}

asts.string_literal.js__cast = function( ast ) {
    return ast.js__value()
}

asts.string_literal.js__value = function( ast ) {
    return `'${ ast.stringify() }'`
}

asts.string_expr.js__value = function( ast ) {
    return ast.expr.js__cast()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_var.js__value = function( ast ) {
    return ast.def.js__var_name()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func.js__value = function( ast ) {
    var def = ast.def;

    if ( def.is_external ) {
        return `M${ def.parent.parent.iid }.${ ast.name }( ${ ast.args.js() } )`
    }

    if ( def.is_user ) {
        if ( ast.args.is_empty() ) {
            return `${ ast.js__func_name() }( xr, x${ ast.xid }, a${ ast.aid } )`
        }

        //  FIXME. Сделать отдельный шаблон для параметров и ставить запятую там.
        return `${ ast.js__func_name() }( xr, x${ ast.xid }, a${ ast.aid }, ${ ast.args.js() } )`
    }

    if ( def.is_internal ) {
        return ast.js__internal()
    }
}

asts.inline_func.js__func_name = function( ast ) {
    var def = ast.def;

    return `f_${ def.normalize_name() }_${ def.fid }`
}

asts.inline_func_arg.js = function( ast ) {
    return ast.value.js__cast()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func.js__internal = function( ast ) {
    switch ( ast.name ) {
        case 'log':
            return `console.log( ${ ast.args.js() } )`

        case 'slice':
            return `I.slice( ${ ast.args.js() } )`
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.true.js__value = function( ast ) {
    return 'true'
}

asts.false.js__value = function( ast ) {
    return 'false'
}

//  ---------------------------------------------------------------------------------------------------------------  //

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
            a${ ast.rid }.set_string( '${ ast.name.js__cast() }', ${ ast.value.js__cast() } );
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
        return `${ from }_to_${ to }( ${ value } )`
    }

    return value
}

//  ---------------------------------------------------------------------------------------------------------------  //

};
