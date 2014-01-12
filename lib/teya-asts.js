var asts = {};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.items = {};

asts.items._init = function() {
    this.items = [];
};

asts.items.add = function( item ) {
    this.items.push( item );
};

asts.items.toString = function() {
    if ( this.items.length > 0 ) {
        var r = this.items
            .join( '\n' )
            .replace( /^/gm, '    ' );

        return this.id + '\n' + r;
    }

    return '';
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.if = {};

asts.if.options = {
    props: 'condition then else'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module = {};

asts.module.options = {
    mixin: 'items',
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_template = {};

asts.def_template.options = {
    props: 'name args body'
};

asts.def_var = {};

asts.def_var.options = {
    props: 'name value'
};

asts.def_func = {};

asts.def_func.options = {
    props: 'name args body'
};

asts.func_args = {};

asts.func_args.options = {
    mixin: 'items'
};

asts.func_arg = {};

asts.func_arg.options = {
    props: 'type name default'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block = {};

asts.block.options = {
    mixin: 'items'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.value = {};

asts.value.options = {
    props: 'value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_string = {};

asts.inline_string.options = {
    props: 'value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.string_content = {};

asts.string_content.options = {
    mixin: 'items'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.string_expr = {};

asts.string_expr.options = {
    props: 'expr'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.string_literal = {};

asts.string_literal.options = {
    props: 'value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath = {};

asts.jpath.options = {
    props: 'abs steps in_context'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath_steps = {};

asts.jpath_steps.options = {
    mixin: 'items'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath_nametest = {};

asts.jpath_nametest.options = {
    props: 'name'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.var = {};

asts.var.options = {
    props: 'name'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_add = {};

asts.inline_add.options = {
    props: 'left op right'
};

asts.inline_number = {};

asts.inline_number.options = {
    props: 'value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.array = {};

asts.array.options = {
    props: 'body'
};

asts.object = {};

asts.object.options = {
    props: 'body'
};

asts.pair = {};

asts.pair.options = {
    props: 'key value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = asts;

//  ---------------------------------------------------------------------------------------------------------------  //

