module.exports = function( asts ) {

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module.yate = function() {
    return `
        ${ this.vars.yate() }

        ${ this.defs.yate() }
    `
}

asts.def_template.yate = function() {
    return `
        ${ this.name } ${ this.yate__args() }
            ${ this.body.yate() }
    `
}

asts.def_template.yate__args = function() {
    var args = this.args;

    if ( args && !args.is_empty() ) {
        return `( ${ args.yate() } )`
    }

    return ''
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_var.yate = function() {
    return `
        ${ this.name } = ${ this.value.yate() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_func.yate = function() {
    return `
        func ${ this.name }( ${ this.args.yate() } )
            ${ this.body.yate() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_arg.yate = function() {
    return `${ this.yate__type() }${ this.name }${ this.yate__default() }`
}

asts.def_arg.yate__default = function() {
    return ( this.default ) ? `= ${ this.default.yate() }` : ''
}

asts.def_arg.yate__type = function() {
    return ( this.type ) ? `${ this.type } ` : ''
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block.yate = function() {
    return `
        ${ this.args.yate() }
        ${ this.defs.yate() }

        ${ this.exprs.yate() }
    `
}

asts.template_param.yate = function() {
    return `${ this.name }: ${ this.value.yate() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template.yate = function() {
    return `
        ${ this.name } ${ this.args.yate() }
            ${ this.content.yate() }
    `
}

asts.template_param.yate = function() {
    return `${ this.name }: ${ this.value.yate() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.if.yate = function() {
    return `
        if ${ this.condition.yate() }
            ${ this.then.yate() }
        ${ this.elses.yate() }
    `
}

asts.else_if.yate = function() {
    return `
        else if ${ this.condition.yate() }
            ${ this.body.yate() }
    `
}

asts.else.yate = function() {
    return `
        else
            ${ this.body.yate() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.for.yate = function() {
    return `
        for ${ this.selector.yate() }
            ${ this.body.yate() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.with.yate = function() {
    return `
        with ${ this.selector.yate() }
            ${ this.body.yate() }
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.object.yate = function() {
    return `
        {
            ${ this.body.yate() }
        }
    `
}

asts.pair.yate = function() {
    return `${ this.key }: ${ this.value.yate() }`
}

asts.inline_pair.yate = function() {
    return `${ this.key }: ${ this.value.yate() }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.array.yate = function() {
    return `
        [
            ${ this.body.yate() }
        ]
    `
}

asts.inline_item.yate = function() {
    return this.value.yate()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.value.yate = function() {
    return this.value.yate()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml.yate = function() {
    if ( this.is_empty ) {
        return `<${ this.name }${ this.attrs.yate() }/>`
    }

    return `
        <${ this.name }${ this.attrs.yate() }>
            ${ this.content.yate() }
    `
}

asts.xml_attr.yate = function() {
     return `${ this.name }=${ this.value.yate }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content.yate = function() {
    return '...'
}

asts.param_content_attrs.yate = function() {
    return '@..'
}

asts.param_content_other.yate = function() {
    return '$..'
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.subexpr.yate = function() {
    return `
        (
            ${ this.body.yate() }
        )
    `
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath.yate = function() {
    return this.steps.yate()
}

asts.jpath_nametest.yate = function() {
    return `.${ this.name }`
}

asts.jpath_predicate.yate = function() {
    return `[ ${ this.expr.yate() } ]`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_binop.yate = function() {
    return `${ this.left.yate() } ${ this.op } ${ this.right.yate() }`
}

asts.inline_unop.yate = function() {
    return `${ this.op }${ this.left.yate() }`
}

asts.inline_ternary.yate = function() {
    return `${ this.condition.yate() } ? ${ this.then.yate() } : ${ this.else.yate() }`
}

asts.inline_number.yate = function() {
    return this.value
}

asts.inline_subexpr.yate = function() {
    return `( ${ this.expr.yate() } )`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_string.yate = function() {
    return `"${ this.value.yate() }"`
}

asts.string_literal.yate = function() {
    return this.stringify()
}

asts.string_expr.yate = function() {
    return `{ ${ this.expr.yate() } }`
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_var.yate = function() {
    return this.name
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func.yate = function() {
    return `${ this.name }( ${ this.args.yate() } )`
}

asts.inline_func_arg.yate = function() {
    return this.value.yate()
}

//  ---------------------------------------------------------------------------------------------------------------  //

asts.true.yate = function() {
    return 'true'
}

asts.false.yate = function() {
    return 'false'
}

//  ---------------------------------------------------------------------------------------------------------------  //

};

