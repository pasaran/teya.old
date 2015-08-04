module.exports = function( asts ) {

//  ---------------------------------------------------------------------------------------------------------------  //

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

        } else if ( l === 2 ) {
            r = items[ 0 ][ method ]() + sep + items[ 1 ][ method ]();

        } else {
            r = '';
            for ( var i = 0; i < l; i++ ) {
                var item = items[ i ];
                var result = item[ method ]();

                if ( result ) {
                    if ( i ) {
                        r += sep;
                    }
                    r += result;
                }
            }
        }

        return r;
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module.teya = function() {
    return `
        ${ this.vars.teya() }

        ${ this.defs.teya() }
    `
}

asts.def_template.teya = function() {
    return `
        ${ this.name } ${ this.teya__args() }
            ${ this.body.teya() }
    `
}

asts.def_template.teya__args = function() {
    var args = this.args;

    if ( args && !args.is_empty() ) {
        return `( ${ args.teya() } )`
    }

    return ''
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_var.teya = function() {
    return `
        ${ this.name } = ${ this.value.teya() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_func.teya = function() {
    return `
        func ${ this.name }( ${ this.args.teya() } )
            ${ this.body.teya() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_arg.teya = function() {
    return `${ this.teya__type() }${ this.name }${ this.teya__default() }`
}

asts.def_arg.teya__default = function() {
    return ( this.default ) ? `= ${ this.default.teya() }` : ''
}

asts.def_arg.teya__type = function() {
    return ( this.type ) ? `${ this.type } ` : ''
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block.teya = function() {
    return `
        ${ this.args.teya() }
        ${ this.defs.teya() }

        ${ this.exprs.teya() }
    `
}

asts.template_param.teya = function() {
    return `${ this.name }: ${ this.value.teya() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template.teya = function() {
    return `
        ${ this.name } ${ this.args.teya() }
            ${ this.content.teya() }
    `
}

asts.template_param.teya = function() {
    return `${ this.name }: ${ this.value.teya() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.if.teya = function() {
    return `
        if ${ this.condition.teya() }
            ${ this.then.teya() }
        ${ this.elses.teya() }
    `
}

asts.else_if.teya = function() {
    return `
        else if ${ this.condition.teya() }
            ${ this.body.teya() }
    `
}

asts.else.teya = function() {
    return `
        else
            ${ this.body.teya() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.for.teya = function() {
    return `
        for ${ this.selector.teya() }
            ${ this.body.teya() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.with.teya = function() {
    return `
        with ${ this.selector.teya() }
            ${ this.body.teya() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.object.teya = function() {
    return `
        {
            ${ this.body.teya() }
        }
    `
}

asts.pair.teya = function() {
    return `${ this.key }: ${ this.value.teya() }`
}

asts.inline_pair.teya = function() {
    return `${ this.key }: ${ this.value.teya() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.array.teya = function() {
    return `
        [
            ${ this.body.teya() }
        ]
    `
}

asts.inline_item.teya = function() {
    return this.value.teya()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.value.teya = function() {
    return this.value.teya()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml.teya = function() {
    if ( this.is_empty ) {
        return `<${ this.name }${ this.attrs.teya() }/>`
    }

    return `
        <${ this.name }${ this.attrs.teya() }>
            ${ this.content.teya() }
    `
}

asts.xml_attr.teya = function() {
     return `${ this.name }=${ this.value.teya }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content.teya = function() {
    return '...'
}

asts.param_content_attrs.teya = function() {
    return '@..'
}

asts.param_content_other.teya = function() {
    return '$..'
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.subexpr.teya = function() {
    return `
        (
            ${ this.body.teya() }
        )
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath.teya = function() {
    return this.steps.teya()
}

asts.jpath_nametest.teya = function() {
    return `.${ this.name }`
}

asts.jpath_predicate.teya = function() {
    return `[ ${ this.expr.teya() } ]`
}

asts.jpath_steps.teya = items_method( 'teya' );

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_binop.teya = function() {
    return `${ this.left.teya() } ${ this.op } ${ this.right.teya() }`
}

asts.inline_unop.teya = function() {
    return `${ this.op }${ this.left.teya() }`
}

asts.inline_ternary.teya = function() {
    return `${ this.condition.teya() } ? ${ this.then.teya() } : ${ this.else.teya() }`
}

asts.inline_number.teya = function() {
    return this.value
}

asts.inline_subexpr.teya = function() {
    return `( ${ this.expr.teya() } )`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_string.teya = function() {
    return `"${ this.value.teya() }"`
}

asts.string_literal.teya = function() {
    return this.stringify()
}

asts.string_expr.teya = function() {
    return `{ ${ this.expr.teya() } }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_var.teya = function() {
    return this.name
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func.teya = function() {
    return `${ this.name }( ${ this.args.teya() } )`
}

asts.inline_func_arg.teya = function() {
    return this.value.teya()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.true.teya = function() {
    return 'true'
}

asts.false.teya = function() {
    return 'false'
}

//  ---------------------------------------------------------------------------------------------------------------  //

};

