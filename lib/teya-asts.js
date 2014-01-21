//  # ASTs
//  ---------------------------------------------------------------------------------------------------------------  //

var asts = {};



//  ## Items
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

    return this.id;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.items.apply = function( callback, params ) {
    var items = this.items;

    for ( var i = 0, l = items.length; i < l; i++ ) {
        var item = items[ i ];

        callback( item, params );
    }
};

asts.items.dowalk = function( callback, params, pkey, pvalue ) {
    callback( this, params, pkey, pvalue );

    var items = this.items;
    for ( var i = 0, l = items.length; i < l; i++ ) {
        var item = items[ i ];

        item.dowalk( callback, params, i, this );
    }
};

asts.items.walkdo = function( callback, params, pkey, pvalue ) {
    var items = this.items;
    for ( var i = 0, l = items.length; i < l; i++ ) {
        var item = items[ i ];

        item.walkdo( callback, params, i, this );
    }

    callback( this, params, pkey, pvalue );
};


//  ## Module and block
//  ---------------------------------------------------------------------------------------------------------------  //

asts.module = {};

asts.module.options = {
    mixin: 'items'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block = {};

asts.block.options = {
    props: 'defs exprs args',
    scope: true
};

asts.block_defs = {};

asts.block_defs.options = {
    mixin: 'items'
};

asts.block_exprs = {};

asts.block_exprs.options = {
    mixin: 'items'
};

asts.block_args = {};

asts.block_args.options = {
    mixin: 'items'
};

asts.block_arg = {};

asts.block_arg.options = {
    props: 'name value'
};


//  ## Declarations
//  ---------------------------------------------------------------------------------------------------------------  //

asts.def = {};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_template = {};

asts.def_template.options = {
    base: 'def',
    props: 'name args body'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_var = {};

asts.def_var.options = {
    base: 'def',
    props: 'name value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_func = {};

asts.def_func.options = {
    base: 'def',
    props: 'name args body'
};

asts.def_func.w_func_def = function() {
    var functions = this.scope.functions;
    var name = this.name;

    if ( functions[ name ] ) {
        this.error( {
            id: 'FUNC_REDEFINITION',
            name: name,
            msg: 'Re-definition of function ' + JSON.stringify( name )
        } );
    }

    this.fid = this.state.fid++;
    this.is_user = true;

    functions[ name ] = this;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_func_args = {};

asts.def_func_args.options = {
    mixin: 'items'
};

asts.def_func_arg = {};

asts.def_func_arg.options = {
    props: 'type name default'
};


//  ## Expressions
//  ---------------------------------------------------------------------------------------------------------------  //

asts.expr = {};


//  ### Block expressions
//  ---------------------------------------------------------------------------------------------------------------  //

asts.if = {};

asts.if.options = {
    base: 'expr',
    props: 'condition then elses'
};

asts.elses = {};

asts.elses.options = {
    mixin: 'items'
};

asts.else_if = {};

asts.else_if.options = {
    props: 'condition body'
};

asts.else = {};

asts.else.options = {
    props: 'body'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.for = {};

asts.for.options = {
    base: 'expr',
    props: 'selector body'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.with = {};

asts.with.options = {
    base: 'expr',
    props: 'selector body'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template = {};

asts.template.options = {
    base: 'expr',
    props: 'name args content'
};

asts.template_args = {};

asts.template_args.options = {
    mixin: 'items'
};

asts.template_arg = {};

asts.template_arg.options = {
    props: 'name value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.value = {};

asts.value.options = {
    base: 'expr',
    props: 'value'
};

asts.value._init_props = function( value ) {
    this.value = value;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.subexpr = {};

asts.subexpr.options = {
    base: 'expr',
    props: 'body'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.array = {};

asts.array.options = {
    base: 'expr',
    props: 'body'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.object = {};

asts.object.options = {
    base: 'expr',
    props: 'body'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.pair = {};

asts.pair.options = {
    base: 'expr',
    props: 'key value'
};

asts.pair._init_props = function( pair ) {
    this.key = pair.key;
    this.value = pair.value;
};

//  #### XML
//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml = {};

asts.xml.options = {
    base: 'expr',
    props: 'name xml_classes xml_id attrs content'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml_attrs = {};

asts.xml_attrs.options = {
    mixin: 'items'
};

asts.xml_attr = {};

asts.xml_attr.options = {
    base: 'expr',
    props: 'name value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml_classes = {};

asts.xml_classes.options = {
    mixin: 'items'
};

asts.xml_class = {};

asts.xml_class.options = {
    props: 'value'
};

asts.xml_id = {};

asts.xml_id.options = {
    props: 'value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content = {};

asts.param_content.options = {
    base: 'expr'
};

asts.param_content_attrs = {};

asts.param_content_attrs.options = {
    base: 'expr'
};

asts.param_content_other = {};

asts.param_content_other.options = {
    base: 'expr'
};



//  ### Inline expressions
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_expr = {};


//  #### Binary operators
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_binop = {};

asts.inline_binop.options = {
    base: 'inline_expr',
    props: 'left op right'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_or = {};

asts.inline_or.options = {
    base: 'inline_binop'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_and = {};

asts.inline_and.options = {
    base: 'inline_binop'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_eq = {};

asts.inline_eq.options = {
    base: 'inline_binop'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_rel = {};

asts.inline_rel.options = {
    base: 'inline_binop'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_add = {};

asts.inline_add.options = {
    base: 'inline_binop'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_mul = {};

asts.inline_mul.options = {
    base: 'inline_binop'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_union = {};

asts.inline_union.options = {
    base: 'inline_binop'
};


//  #### Unary operators
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_unop = {};

asts.inline_unop.options = {
    base: 'inline_expr',
    props: 'left op'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_unary = {};

asts.inline_unary.options = {
    base: 'inline_unop'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_not = {};

asts.inline_not.options = {
    base: 'inline_unop'
};


//  #### Inline primaries
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_number = {};

asts.inline_number.options = {
    base: 'inline_expr',
    props: 'value'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_subexpr = {};

asts.inline_subexpr.options = {
    base: 'inline_expr',
    props: 'expr'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_var = {};

asts.inline_var.options = {
    base: 'inline_expr',
    props: 'name'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func = {};

asts.inline_func.options = {
    base: 'inline_expr',
    props: 'name args context'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_ternary = {};

asts.inline_ternary.options = {
    base: 'inline_expr',
    props: 'condition then else'
};


//  ##### Inline stirng
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_string = {};

asts.inline_string.options = {
    base: 'inline_expr',
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


//  #### JPath
//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath = {};

asts.jpath.options = {
    base: 'inline_expr',
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

asts.jpath_predicate = {};

asts.jpath_predicate.options = {
    props: 'expr'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath_filter = {};

asts.jpath_filter.options = {
    base: 'inline_expr',
    props: 'jpath expr'
};


//  #### Inline misc
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_pairs = {};

asts.inline_pairs.options = {
    mixin: 'items'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_pair = {};

asts.inline_pair.options = {
    props: 'key value'
};

asts.inline_pair._init_props = function( pair ) {
    this.key = pair.key;
    this.value = pair.value;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_items = {};

asts.inline_items.options = {
    mixin: 'items'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_item = {};

asts.inline_item.options = {
    props: 'value'
};

asts.inline_item._init_props = function( value ) {
    this.value = value;
};



//  ## Misc
//  ---------------------------------------------------------------------------------------------------------------  //




//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = asts;

//  ---------------------------------------------------------------------------------------------------------------  //

