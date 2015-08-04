module.exports = function( asts ) {

function items_method( method, sep ) {
    sep = sep || '';

    return function() {
        var items = this.items;
        var l = items.length;

        var r;
        if ( l === 0 ) {
            r = '';

        } else if ( l === 1 ) {
            r = items[ 0 ][ method ]();

        } else {
            r = '';
            var not_first = false;
            for ( var i = 0; i < l; i++ ) {
                var item = items[ i ];
                var result = item[ method ]();

                if ( result != null && result !== '' ) {
                    if ( not_first ) {
                        r += sep;

                    } else {
                        not_first = true;
                    }

                    r += result;
                }
            }
        }

        return r;
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module.js = function() {
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

        ${ this.imports.js() }

        ${ this.vars.js__define() }
        ${ this.funcs.js__define() }

        ${ this.templates.js() }

        M.init = function( xr, x0 ) {
            ${ this.imports.js__init() }
            ${ this.vars.js__def() }
            ${ this.vars.js__export() }
            ${ this.vars.js__init() }
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

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module_vars.js__define = function() {
    if ( !this.is_empty() ) {
        return `var ${ this.js__list() };`
    }

    return '';
}

asts.module_vars.js__list = items_method( 'js__list', ', ' );
asts.module_vars.js__init = items_method( 'js__init', '\n' );
asts.module_vars.js__def = items_method( 'js__def', '\n' );
asts.module_vars.js__export = items_method( 'js__export', '\n' );

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module_templates.js = items_method( 'js', '\n' );

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module_imports.js = items_method( 'js', '\n' );
asts.module_imports.js__init = items_method( 'js__init', '\n' );

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module_funcs.js__define = items_method( 'js__define', '\n' );

//  ---------------------------------------------------------------------------------------------------------------  //

asts.import.js = function() {
    var iid = this.iid;

    if ( this.is_js ) {
        return `
            var M${ iid } = require( './${ this.filename }' );
        `
    }

    return `
        var M${ iid } = require( './${ this.filename }.js' );
        var T${ iid } = M${ iid }.templates;
        var V${ iid } = M${ iid }.vars;
    `
}

asts.import.js__init = function() {
    if ( !this.is_js ) {
        return `
            M${ this.iid }.init( xr, x0 );
        `
    }

    return '';
}

asts.def_imported_template.js = function() {
    if ( this.namespace ) {
        return `
            var t_${ this.normalize_name() } = T${ this.import.iid }[ '${ this.shortname }' ];
        `
    }

    return `
        var t_${ this.normalize_name() } = T[ '${ this.name }' ] = T${ this.import.iid }[ '${ this.shortname }' ];
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_template.js = function() {
    return `
        //  ${ this.name }: ${ this.get_type() }
        function ${ this.js__template_name() }( ${ this.js__func_args() } ) {
            ${ this.args.js__default() }
            ${ this.js__template_prologue() }
            ${ this.body.js__output() }
            ${ this.js__template_epilogue() }
        }
        T[ '${ this.name }' ] = ${ this.js__template_name() };
    `
}

asts.def_template.js__template_name = function() {
    return `t_${ this.normalize_name() }`
}

//  def_template :func_args [ this.get_type() === 'pair' || this.get_type() === 'item' ]
//      x%rid, r%rid, content, vars

asts.def_template.js__func_args = function() {
    var args = this.args;

    if ( args ) {
        return `xr, x${ this.rid }, a${ this.aid }, ca, cr${ this.args.js__template_arg() }`
    }

    return `xr, x${ this.rid }, a${ this.aid }, ca, cr`
}

asts.def_template.js__template_prologue = function() {
    var type = this.get_type();

    if ( type === 'attr' ) {
        return `//  var a${ this.aid } = attrs();`

    } else if ( type === 'pair' || type === 'item' ) {
        return '';
    } else {
        return `var r${ this.rid } = ${ this.js__default_value() };`
    }
}

asts.def_template.js__template_epilogue = function() {
    if ( this.get_type() === 'attr' ) {

    } else {
        return `
            return r${ this.rid };
        `
    }
}

asts.def_args.js__template_arg = items_method( 'js__template_arg' );
asts.def_args.js__default = items_method( 'js__default' );
asts.def_args.js__func_arg = items_method( 'js__func_arg' );

asts.def_arg.js__default = function() {
    if ( this.default ) {
        return `
            if ( ${ this.js__var_name() } == null ) { ${ this.js__var_name() } = ${ this.default.js__cast() }; }
        `
    }

    return ''
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
        var body = this.body;
        var args = this.args;

        if ( body.is_inline() ) {
            //  FIXME: Возможно, тут должно быть body:cthis.
            return `
                //  ${ this.get_full_name() } : ${ this.get_type() }
                function ${ this.js__func_name() }( xr, x0, a0${ args.js__func_arg() } ) {
                    ${ args.js__default() }
                    return ${ body.js__value() };
                }
            `
        }

        return `
            //  ${ this.get_full_name() } : ${ this.get_type() }
            function ${ this.js__func_name() }( xr, x0, a0${ args.js__func_arg() } ) {
                ${ args.js__default() }
                ${ this.js__func_prologue() }
                ${ body.js__output() }
                ${ this.js__func_epilogue() }
            }
        `
    }

    return '';
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

asts.block_defs.js__def = items_method( 'js__def', '\n' );
asts.block_exprs.js__output = items_method( 'js__output', '\n' );
asts.block_exprs.js__value = items_method( 'js__value' );
asts.block_exprs.js__cast = items_method( 'js__cast' );

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

        return `( ${ this.condition.js__value() } ) ? ${ this.then.exprs.js__cast() } : ${ this.elses.js__cast() }`
    }
}

asts.if.js__cast = function() {
    return this.js__value()
}

asts.if.js__output = function() {
    if ( this.is_inline() ) {
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

asts.elses.js__if_body = items_method( 'js__if_body', ' ' );
asts.elses.js__cast = items_method( 'js__cast' );

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

asts.value.js__cast = function() {
    return this.value.js__cast()
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

    if ( !this.to_type ) {
        //  FIXME: А почему тут было %value:cast?
        return `r${ this.rid } = ${ this.value.js__value() };`
    }

    return `r${ this.rid } += ${ this.value.js__cast() };`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template.js__name = function() {
    return `t_${ this.normalize_name() }`
}

asts.template.js__output = function() {
    var type = this.def.get_type();

    var params = this.params;
    var content = this.content;
    var content_rid = content.rid;

    if ( type === 'attr' ) {
        return `
            ${ params.js__template_param_def() }
            //  ${ type }
            ${ content.js__content() }
            ${ this.js__name() }( xr, ${ this.js__context() }, a${ this.aid }, a${ content_rid }, r${ content_rid }${ params.js__template_param_value() } );
        `
    }

    if ( type === 'string' || type === 'xml' ) {
        return `
            ${ params.js__template_param_def() }
            //  ${ type }
            ${ content.js__content() }
            r${ this.rid } += ${ this.js__name() }( xr, ${ this.js__context() }, a${ this.aid }, a${ content_rid }, r${ content_rid }${ params.js__template_param_value() } );
        `
    }

    return `
        ${ params.js__template_param_def() }
        //  ${ type }
        ${ content.js__content() }
        r${ this.rid } = ${ this.js__name() }( xr, ${ this.js__context() }, a${ this.aid }, a${ content_rid }, r${ content_rid }${ params.js__template_param_value() } );
    `
}

asts.template.js__context = function() {
    if ( this.context ) {
        return this.context.js__value()
    }

    return `x${ this.xid }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template_params.js__template_param_def = items_method( 'js__template_param_def', ', ' );
asts.template_params.js__template_param_value = items_method( 'js__template_param_value', '' );

//  FIXME: А почему тут не asts.template_param?
//
asts.ast.js__template_param_def = function() {
    var value = this.value;

    if ( value && !this.is_inline() ) {
        return `
            //  ${ this.name }: ${ value.get_type() }
            ${ value.js__prologue() }
            ${ value.js__output() }
            ${ this.js__template_param_epilogue() }
        `
    }

    return ''
}

asts.ast.js__template_param_epilogue = function() {
    var value = this.value;

    if ( value.get_type() === 'attr' ) {
        return `
            //  ${ this.name }: ${ this.get_type() }
            var ${ this.js__param_name() } = a${ value.rid };
        `
    }

    return `
        //  ${ this.name }: ${ this.get_type() }
        var ${ this.js__param_name() } = r${ value.rid };
    `
}

asts.template_param.js__template_param_value = function() {
    var value = this.value;

    if ( value ) {
        if ( value.is_inline() ) {
            return `, ${ value.js__cast() }`
        }

        return `, ${ this.js__param_name() }`
    }

    return ', null'
}

asts.ast.js__param_name = function() {
    return `z${ this.rid }_${ this.normalize_name() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.subexpr.js__output = function() {
    return this.body.js__output()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath.js__value = function() {
    if ( this.abs ) {
        if ( !this.steps ) {
            return 'xr'
        }

        return `no.jpath( '${ this.teya() }', xr )`
    }

    if ( !this.steps ) {
        return `x${ this.xid }`
    }

    return `no.jpath( '${ this.teya() }', x${ this.xid } )`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_binop.js__cast = function() {
    return `${ this.left.js__cast() } ${ this.op } ${ this.right.js__cast() }`
}

asts.inline_binop.js__value = function() {
    return `${ this.left.js__value() } ${ this.op } ${ this.right.js__value() }`
}

asts.inline_unop.js__value = function() {
    return `${ this.op }${ this.left.js__value() }`
}

asts.inline_ternary.js__value = function() {
    return `( ${ this.condition.js__value() } ) ? ${ this.then.js__value() } : ${ this.else.js__value() }`
}

asts.inline_number.js__value = function() {
    return this.value
}

asts.inline_subexpr.js__value = function() {
    return `( ${ this.expr.js__value() } )`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.string_content.js__name = items_method( 'js__name' );
asts.string_content.js__cast = items_method( 'js__cast', ' + ' );

asts.inline_string.js__cast = function() {
    return this.value.js__cast()
}

asts.inline_string.js__value = function() {
    return this.value.js__cast()
}

asts.string_literal.js__name = function() {
    return this.stringify()
}

asts.string_literal.js__cast = function() {
    return this.js__value()
}

asts.string_literal.js__value = function() {
    return `'${ this.stringify() }'`
}

asts.string_expr.js__value = function() {
    return this.expr.js__cast()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_var.js__value = function() {
    return this.def.js__var_name()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func.js__value = function() {
    var def = this.def;

    if ( def.is_external ) {
        return `M${ def.parent.parent.iid }.${ this.name }( ${ this.args.js() } )`
    }

    if ( def.is_user ) {
        if ( this.args.is_empty() ) {
            return `${ this.js__func_name() }( xr, x${ this.xid }, a${ this.aid } )`
        }

        //  FIXME. Сделать отдельный шаблон для параметров и ставить запятую там.
        return `${ this.js__func_name() }( xr, x${ this.xid }, a${ this.aid }, ${ this.args.js() } )`
    }

    if ( def.is_internal ) {
        return this.js__internal()
    }
}

asts.inline_func.js__func_name = function() {
    var def = this.def;

    return `f_${ def.normalize_name() }_${ def.fid }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func_args.js = items_method( 'js', ', ' );


asts.inline_func_arg.js = function() {
    return this.value.js__cast()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func.js__internal = function() {
    switch ( this.name ) {
        case 'log':
            return `console.log( ${ this.args.js() } )`

        case 'slice':
            return `I.slice( ${ this.args.js() } )`
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.true.js__value = function() {
    return 'true'
}

asts.false.js__value = function() {
    return 'false'
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.object.js__output = function() {
    return this.body.js__output()
}

asts.object.js__value = function() {
    if ( this.body.is_inline() ) {
        return `{ ${ this.body.js__value() } }`
    }

    return ''
}

asts.inline_object.js__value = function() {
    return `{ ${ this.body.js__value() } }`
}

asts.inline_pair.js__output = function() {
    if ( this.value.is_inline() ) {
        return `
            r${ this.rid }[ ${ this.key.js__value() } ] = ${ this.value.js__value() };
        `
    }

    return ''
}

asts.pair.js__output = function() {
    return `
        ${ this.value.js__prologue() }
        ${ this.value.js__output() }
        r${ this.rid }[ ${ this.key.js__value() } ] = r${ this.value.rid };
    `
}

asts.pair.js__value = function() {
    return `
        ${ this.key.js__value() }: ${ this.value.js__value() }
    `
}

asts.inline_pair.js__value = function() {
    return `
        ${ this.key.js__value() }: ${ this.value.js__value() }
    `
}

asts.inline_pairs.js__value = items_method( 'js__value', ', ' );
asts.inline_pairs.js__output = items_method( 'js__output', '\n' );

//  ---------------------------------------------------------------------------------------------------------------  //

asts.array.js__output = function() {
    return this.body.js__output()
}

asts.array.js__value = function() {
    if ( this.body.is_inline() ) {
        return `[ ${ this.body.js__value() } ]`
    }
}

asts.inline_array.js__value = function() {
    return `[ ${ this.body.js__value() } ]`
}

asts.inline_item.js__value = function() {
    return this.value.js__value()
}

//  FIXME: Хочется иметь один push на все item'ы.
//  Сейчас это невозможно сделать из-за текущей реализации шаблонов.
//
asts.inline_item.js__output = function() {
    return `
        r${ this.rid }.push( ${ this.value.js__value() } );
    `
}

asts.inline_items.js__value = items_method( 'js__value', ', ' );
asts.inline_items.js__output = items_method( 'js__output', '\n' );

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml.js__output = function() {
    return `
        ${ this.js__start() }
        ${ this.content.js__output() }
        ${ this.js__end() }
    `
}

asts.xml.js__start = function() {
    var is_const = this.name.is_const();
    var starts_with_attr = this.content.starts_with_attr();

    if ( is_const ) {
        if ( starts_with_attr !== false ) {
            var name = this.name.js__name();

            return `
                r${ this.rid } += '<${ name }';
                a${ this.aid } = attrs( '${ name }', {
                    ${ this.attrs.js__output() }
                } );
            `
        }

        return `
            r${ this.rid } += ${ this.js__static_name() };
        `
    }

    if ( starts_with_attr !== false ) {
        var nid = this.nid;

        return `
            var n${ nid } = to_tagname( ${ this.name.js__cast() } );
            r${ this.rid } += '<' + n${ nid };
            a${ this.aid } = attrs( n${ nid }, {
                ${ this.attrs.js__output() }
            } );
        `
    }

    return `
        var n${ this.nid } = to_tagname( ${ this.name.js__cast() } );
        r${ this.rid } += ${ this.js__dynamic_name() };
    `
}

asts.xml.js__close_start_tag = function() {
    return ( this.is_empty_tag ) ? '/>' : '>'
}

asts.xml.js__static_name = function() {
    if ( this.attrs.is_empty() ) {
        return `
            '<${ this.name.js__name() }${ this.js__close_start_tag() }'
        `
    }

    return `
        '<${ this.name.js__name() }' + ${ this.attrs.js__inline() } + '${ this.js__close_start_tag() }'
    `
}

asts.xml.js__dynamic_name = function() {
    var nid = this.nid;

    if ( this.attrs.is_empty() ) {
        return `
            '<' + n${ nid } + ( is_empty_tag( n${ nid } ) ? '/>' : '>' )
        `
    }

    return `
        '<' + n${ nid } + ${ this.attrs.js__inline() } + ( is_empty_tag( n${ nid } ) ? '/>' : '>' )
    `
}

asts.xml.js__end = function() {
    if ( this.name.is_const() ) {
        if ( this.is_empty_tag ) {
            return ''

        } else {
            return `
                r${ this.rid } += '</${ this.name.js__name() }>';
            `
        }
    }

    var nid = this.nid;

    return `
        if ( !is_empty_tag( n${ nid } ) ) {
            r${ this.rid } += '</' + n${ nid } + '>';
        }
    `
}

asts.xml_attrs.js__inline = items_method( 'js__inline', ' + ' );
asts.xml_attrs.js__output = items_method( 'js__output', ',\n' );

asts.xml_attr.js__inline = function() {
    if ( this.value.get_type() === 'xml' ) {
        return `
            " ${ this.name }='" + xml_to_attrvalue( ${ this.value.js__cast() } ) + "'"
        `
    }

    return `
        " ${ this.name }='" + string_to_attrvalue( ${ this.value.js__cast() } ) + "'"
    `
}

asts.xml_attr.js__output = function() {
    if ( this.value.get_type() === 'xml' ) {
        //  FIXME: Тут, видимо, должно быть %value:cast?
        return `
            '${ this.name }': xml_attr( ${ this.value.js__value() } )
        `
    }

    //  FIXME: Тут, видимо, должно быть %value:cast?
    return `
        '${ this.name }': string_attr( ${ this.value.js__value() } )
    `
}

asts.close_attrs.js__output = function() {
    var rid = this.rid;

    return `
        r${ rid } += a${ rid }.close();
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.attr.js__output = function() {
    if ( this.value.get_cast_type() === 'json' ) {
        //  FIXME: Или тут нужно `this.value.js__cast()`?
        return `
            a${ this.rid }.set_xml( '${ this.name }', JSON.stringify( ${ this.value.js__value() } ) );
        `
    }

    var type = this.value.get_type();
    var is_inline = this.value.is_inline;

    if ( is_inline ) {
        if ( type === 'xml' ) {
            if ( this.op === '+=' ) {
                return `
                    a${ this.rid }.add_xml( '${ this.name }', ${ this.value.js__cast() } );
                `
            }

            return `
                a${ this.rid }.set_xml( '${ this.name }', ${ this.value.js__cast() } );
            `
        }

        if ( this.op === '+=' ) {
            return `
                a${ this.rid }.add_string( '${ this.name }', ${ this.value.js__cast() } );
            `
        }

        return `
            a${ this.rid }.set_string( '${ this.name }', ${ this.value.js__cast() } );
        `
    }

    return `
        ${ this.value.js__prologue() }
        ${ this.value.js__output() }
        ${ this.js__epilogue() }
    `
}

asts.attr.js__epilogue = function() {
    //  attr :epilogue [ this.value.get_type() === 'attr' ]
    //      //  @%name: %value.get_type()
    //      var %.:var_name = a%{value.rid};

    return `
        //  @${ this.name }: ${ this.value.get_type() }
        a${ this.rid }.set_string( '${ this.name.js__cast() }', r${ this.value.rid } );
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content.js__output = function() {
    var rid = this.rid;

    return `
        a${ rid }.merge( ca );
        r${ rid } += a${ rid }.close() + cr;
    `
}

asts.param_content_attrs.js__output = function() {
    return `
        a${ this.rid }.merge( ca );
    `
}

asts.param_content_other.js__output = function() {
    var rid = this.rid;

    return `
        r${ rid } += a${ rid }.close() + cr;
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.ast.js__default_value = function() {
    switch ( this.get_cast_type() ) {
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

asts.inline_expr.js__cast = function() {
    var from = this.from_type;
    var to = this.to_type;

    var value = this.js__value();

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
