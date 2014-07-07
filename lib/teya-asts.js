var no = require( 'nommon' );

var R = require( './runtime.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var types = require( './teya-types.js' );
var TYPE = types;

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

asts.items.is_empty = function() {
    return ( this.items.length === 0 );
};

asts.items.length = function() {
    return this.items.length;
};

asts.items.starts_with_attr = function() {
    var items = this.items;

    if ( items.length === 0 ) {
        return false;
    }

    return items[ 0 ].starts_with_attr();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.items.cast = function( to ) {
    to = to || this.get_type();
    //  console.log( 'ITEMS.CAST', this.id, this.get_type(), to );

    var items = this.items;
    for ( var i = 0, l = items.length; i < l; i++ ) {
        var item = items[ i ];

        var from = item.get_type();
        if ( !types.is_castable( from, to ) ) {
            item.error( {
                id: 'CAST_ERROR',
                from: from,
                to: to,
                msg: 'Cannot convert from ' + JSON.stringify( from ) + ' to ' + JSON.stringify( to )
                //  FIXME:
                //  msg: 'Cannot convert from "%from" to "%to"'
                //  msg: 'Cannot convert from "{ .from }" to "{ ..to }"'
            } );
        }

        item.cast( to );
    }
};

/*
asts.items.oncast = function( to ) {
    var items = this.items;
    for ( var i = 0, l = items.length; i < l; i++ ) {
        items[ i ].cast( to );
    }
};
*/

//  ---------------------------------------------------------------------------------------------------------------  //

asts.items.string_children = function( with_type ) {
    var r = [];

    var items = this.items;
    for ( var i = 0, l = items.length; i < l; i++ ) {
        r.push( items[ i ].to_string( with_type ) );
    }

    return ( r.length ) ? r.join( '\n' ).replace( /^/gm, '    ' ) : '';
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.items._get_type = function() {
    var items = this.items;
    var l = items.length;

    if ( l === 0 ) { return TYPE.SCALAR; }

    var prev = items[ 0 ];
    var prev_type = prev.get_type();

    for ( var i = 1; i < l; i++ ) {
        var item = items[ i ];
        var type = item.get_type();

        var common_type = types.join_types( prev_type, type );
        if ( common_type === TYPE.UNDEF ) {
            item.error( {
                ID: 'WRONG_TYPES',
                types: [ prev_type, type ],
                msg: 'Несовместимые типы ' + prev_type + ' (' + prev.id + ') и ' + type + ' (' + item.id + ')'
            } );
        }

        prev = item;
        prev_type = common_type;
    }

    return prev_type;
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

//  ---------------------------------------------------------------------------------------------------------------  //

asts.items.is_inline = function() {
    var items = this.items;

    var l = items.length;
    return ( l === 0 ) || ( l === 1 && items[ 0 ].is_inline() );
};

asts.items.is_const = function() {
    var items = this.items;

    for ( var i = 0, l = items.length; i < l; i++ ) {
        var item = items[ i ];

        if ( !item.is_const() ) {
            return false;
        }
    }

    return true;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  ---------------------------------------------------------------------------------------------------------------  //

//  Q.  Чем items отличаются от collection?
//
//  A.  Тем, что items -- это выражение, например, все выражения в блоке,
//      а collection это просто набор чего-либо, например, elses в if
//      (содержит энное количество else_if и, возможно, else).
//

asts.collection = {};

asts.collection.options = {
    base: 'items'
};

asts.collection.get_type = function() {
    return TYPE.NONE;
};

asts.collection.is_inline = function() {
    var items = this.items;

    switch ( items.length ) {
        case 0: return true;
        case 1: return items[ 0 ].is_inline();
    }

    return false;
};


//  ## Module and block
//  ---------------------------------------------------------------------------------------------------------------  //

asts.module = {};

asts.module.options = {
    props: 'vars defs'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module_vars = {};

asts.module_vars.options = {
    mixin: 'collection'
};

asts.module_vars.teya__sep = '\n';

asts.module_vars.js__sep__init = '\n';
asts.module_vars.js__sep__list = ', ';
asts.module_vars.js__sep__def = '\n';

//  ---------------------------------------------------------------------------------------------------------------  //

asts.module_defs = {};

asts.module_defs.options = {
    mixin: 'collection'
};

asts.module_defs.teya__sep = '\n';
asts.module_defs.js__sep = '\n';

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block = {};

asts.block.options = {
    props: 'defs exprs args',
    scope: true
};

asts.block._get_type = function() {
    return this.exprs.get_type();
};

asts.block.oncast = function( to ) {
    this.exprs.cast( to );
};

asts.block.is_inline = function() {
    return this.defs.is_empty() && this.exprs.is_inline();
};

asts.block.starts_with_attr = function() {
    return this.exprs.starts_with_attr();
};

asts.block.w_prepare = function() {
    if ( this.get_type() !== TYPE.XML && this.to_type !== TYPE.XML ) {
        return;
    }

    var items = this.exprs.items;
    var _items = [];

    var is_opened = true;
    for ( var i = 0, l = items.length; i < l; i++ ) {
        var item = items[ i ];

        if ( item.get_type() !== TYPE.ATTR ) {
            if ( is_opened ) {
                _items.push( this.exprs.child( 'close_attrs' ) );
                is_opened = false;
            }
        } else {
            is_opened = true;
        }

        _items.push( item );
    }

    //  FIXME: Можно ли это сделать как-то более элегантно? Без `this.parent`?
    if ( is_opened && this.parent.id === 'xml' ) {
        _items.push( this.exprs.child( 'close_attrs' ) );
    }

    this.exprs.items = _items;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block_defs = {};

asts.block_defs.options = {
    mixin: 'collection'
};

asts.block_defs.teya__sep = '\n';
asts.block_defs.js__sep__def = '\n';

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block_exprs = {};

asts.block_exprs.options = {
    mixin: 'items'
};

asts.block_exprs.teya__sep = '\n\n';
asts.block_exprs.js__sep__output = '\n';

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block_args = {};

asts.block_args.options = {
    mixin: 'collection'
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.block_arg = {};

asts.block_arg.options = {
    props: 'name value'
};

asts.block_arg._get_type = function() {
    return this.value.get_type();
};


//  ## Declarations
//  ---------------------------------------------------------------------------------------------------------------  //

asts.def = {};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_template = {};

asts.def_template.options = {
    base: 'def',
    props: 'name args body',
    scope: true
};

asts.def_template._get_type = function() {
    return this.body.get_type();
};

asts.def_template.w_def = function() {
    //  NOTE: Добавляем шаблон в корневой scope!
    var templates = this.scope.root.templates;
    var name = this.name;

    if ( templates[ name ] ) {
        this.error( {
            id: 'TEMPLATE_REDEFINITION',
            name: name,
            msg: 'Re-definition of template ' + JSON.stringify( name )
        } );
    }

    this.tid = this.state.tid++;

    templates[ name ] = this;
};

asts.def_template.w_prepare = function() {
    this.body.cast();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_var = {};

asts.def_var.options = {
    base: 'def',
    props: 'name value'
};

asts.def_var.w_def = function() {
    var vars = this.scope.vars;
    var name = this.name;

    if ( vars[ name ] ) {
        this.error( {
            id: 'VAR_REDEFINITION',
            name: name,
            msg: 'Re-definition of variable ' + JSON.stringify( name )
        } );
    }

    this.vid = this.state.vid++;
    this.is_user = true;

    vars[ name ] = this;
};

asts.def_var._get_type = function() {
    return this.value.get_type();
};

asts.def_var.w_prepare = function() {
    if ( !this.value.is_inline() ) {
        this.value.rid++;
    }
    this.value.cast();
};

asts.def_var.normalize_name = function() {
    return this.name.replace( /-/g, '_' );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_func = {};

asts.def_func.options = {
    base: 'def',
    props: 'name args body',
    scope: true
};

asts.def_func.w_def = function() {
    var functions = this.scope.root.functions;
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

asts.def_func._get_type = function() {
    if ( this.type ) {
        return this.type;
    }

    if ( this.__calc_type ) {
        this.error( {
            id: 'RECURSION',
            msg: 'Recursive function without type declaration'
        } );
    }
    this.__calc_type = true;

    return this.body.get_type();
};

asts.def_func.w_prepare = function() {
    this.body.cast();
};


//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_args = {};

asts.def_args.options = {
    mixin: 'collection'
};

asts.def_args.teya__sep = ', ';

//  ---------------------------------------------------------------------------------------------------------------  //

asts.def_arg = {};

asts.def_arg.options = {
    props: 'type name default'
};

asts.def_arg.w_action = function() {
    var vars = this.scope.vars;
    var name = this.name;

    if ( vars[ name ] ) {
        this.error( {
            id: 'VAR_REDEFINITION',
            name: name,
            msg: 'Re-definition of variable ' + JSON.stringify( name )
        } );
    }

    this.vid = this.state.vid++;
    this.is_arg = true;

    vars[ name ] = this;
};

asts.def_arg._get_type = function() {
    return this.type || TYPE.SCALAR;
};

asts.def_arg.w_prepare = function() {
    if ( this.default ) {
        this.default.cast( this.get_type() );
    }
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

asts.if._get_type = function() {
    var type = this.then.get_type();

    var elses = this.elses.items;
    for ( var i = 0, l = elses.length; i < l; i++ ) {
        type = types.common_type( type, elses[ i ].get_type() );
    }

    return type;
};

asts.if.w_prepare = function() {
    this.condition.cast( TYPE.BOOLEAN );

    var elses = this.elses.items;
    for ( var i = 0, l = elses.length; i < l; i++ ) {
        var condition =  elses[ i ].condition;
        if ( condition ) {
            condition.cast( TYPE.BOOLEAN );
        }
    }
};

asts.if.oncast = function( to ) {
    this.then.cast( to );
    this.elses.cast( to );
};

asts.if.is_inline = function() {
    return this.then.is_inline() && this.elses.is_inline();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.elses = {};

asts.elses.options = {
    mixin: 'collection'
};

asts.elses.teya__sep = '\n';
asts.elses.js__sep__if_body = ' ';

//  ---------------------------------------------------------------------------------------------------------------  //

asts.else_if = {};

asts.else_if.options = {
    props: 'condition body'
};

asts.else_if._get_type = function() {
    return this.body.get_type();
};

//  NOTE: is_inline === no.false
//  Поэтому, если есть хоть один else if, то if не может быть is_inline.

asts.else_if.oncast = function( to ) {
    this.body.cast( to );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.else = {};

asts.else.options = {
    props: 'body'
};

asts.else._get_type = function() {
    return this.body.get_type();
};

asts.else.is_inline = function() {
    return this.body.is_inline();
};

asts.else.oncast = function( to ) {
    this.body.cast( to );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.for = {};

asts.for.options = {
    base: 'expr',
    props: 'selector body'
};

asts.for._get_type = function() {
    var type = this.body.get_type();

    return types.join_types( type, type );
};

asts.for.w_prepare = function() {
    this.body.cid++;

    this.body.cast( this.get_type() );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.with = {};

asts.with.options = {
    base: 'expr',
    props: 'selector body'
};

asts.with._get_type = function() {
    return this.body.get_type();
};

asts.with.w_prepare = function() {
    this.body.cast( this.get_type() );
};

asts.with.is_inline = function() {
    return this.body.is_inline();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template = {};

asts.template.options = {
    base: 'expr',
    props: 'name args content'
};

asts.template._get_type = function() {
    return this.def.get_type();
};

asts.template.w_action = function() {
    var name = this.name;

    var def = this.scope.find_template( name );
    //  NOTE: Кажется, не может быть так, чтобы def был неопределен.
    //  Иначе этот идентификатор не будет считаться template,
    //  а будет var.

    this.def = def;
};

asts.template.w_prepare = function() {
    this.nid = 0;

    this.content.cast();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.template_args = {};

asts.template_args.options = {
    mixin: 'collection'
};

asts.template_args.teya__sep = ', ';

asts.template_arg = {};

asts.template_arg.options = {
    props: 'name value'
};

asts.template_arg._get_type = function() {
    return this.value.get_type();
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

asts.value._get_type = function() {
    return this.value.get_type();
};

asts.value.is_inline = function() {
    return this.value.is_inline();
};

asts.value.oncast = function( to ) {
    this.value.cast( to );
};

asts.value.starts_with_attr = function() {
    return ( this.value.get_type() === TYPE.ATTR );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.subexpr = {};

asts.subexpr.options = {
    base: 'expr',
    props: 'body'
};

asts.subexpr._get_type = function() {
    return this.body.get_type();
};

asts.subexpr.is_inline = function() {
    this.body.is_inline();
};

asts.subexpr.oncast = function( to ) {
    this.body.cast( to );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.array = {};

asts.array.options = {
    base: 'expr',
    props: 'body'
};

asts.array._get_type = function() {
    return TYPE.ARRAY;
};

asts.array.is_inline = function() {
    return this.body.is_inline();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.object = {};

asts.object.options = {
    base: 'expr',
    props: 'body'
};

asts.object._get_type = function() {
    return TYPE.OBJECT;
};

asts.object.is_inline = function() {
    return this.body.is_inline();
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

asts.pair._get_type = function() {
    return TYPE.PAIR;
};

asts.pair.w_prepare = function() {
    this.value.rid++;

    this.key.cast( TYPE.SCALAR );
    this.value.cast();
};

asts.pair.is_inline = function() {
    return this.value.is_inline();
};


//  #### XML
//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml = {};

asts.xml.options = {
    base: 'expr',
    props: 'name xml_classes xml_id attrs content'
};

asts.xml._get_type = function() {
    return TYPE.XML;
};

asts.xml.w_prepare = function() {
    this.content.cast( TYPE.XML );

    if ( !this.name.is_const() ) {
        this.nid++;
        this.name.cast( TYPE.STRING );
    }
};

asts.xml.starts_with_attr = no.true;

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml_attrs = {};

asts.xml_attrs.options = {
    mixin: 'collection'
};

asts.xml_attr = {};

asts.xml_attr.options = {
    base: 'expr',
    props: 'name value'
};

asts.xml_attr._get_type = function() {
    return TYPE.ATTR;
};

asts.xml_attr.w_prepare = function() {
    //  FIXME: Тут должно быть attrvalue?
    this.value.cast( TYPE.STRING );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.xml_classes = {};

asts.xml_classes.options = {
    mixin: 'collection'
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

asts.attr = {};

asts.attr.options = {
    base: 'expr',
    props: 'name value'
};

asts.attr._get_type = function() {
    return TYPE.ATTR;
};

asts.attr.w_prepare = function() {
    this.value.cast( TYPE.STRING );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content = {};

asts.param_content.options = {
    base: 'expr'
};

asts.param_content._get_type = function() {
    return TYPE.XML;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content_attrs = {};

asts.param_content_attrs.options = {
    base: 'expr'
};

asts.param_content_attrs._get_type = function() {
    return TYPE.ATTR;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.param_content_other = {};

asts.param_content_other.options = {
    base: 'expr'
};

asts.param_content_other._get_type = function() {
    return TYPE.XML;
};



//  ### Inline expressions
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_expr = {};

asts.inline_expr.is_inline = no.true;

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

asts.inline_or._get_type = function() {
    //  Почему тут берется тип правого аргумента?
    //  Потому что, если левый аргумент ложен, то мы получим правый аргумент.
    //  Если же он истинен, то как минимум должен приводиться к типу правого аргумента.
    //
    return this.right.get_type();
};

asts.inline_or.w_prepare = function() {
    var type = this.get_type();

    this.left.cast( type );
    this.right.cast( type );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_and = {};

asts.inline_and.options = {
    base: 'inline_binop'
};

asts.inline_and._get_type = function() {
    //  См. комментарии к inline_or._get_type.
    //
    return this.right.get_type();
};

asts.inline_and.w_prepare = function() {
    var type = this.get_type();

    this.left.cast( type );
    this.right.cast( type );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_eq = {};

asts.inline_eq.options = {
    base: 'inline_binop'
};

asts.inline_eq._get_type = function() {
    return TYPE.BOOLEAN;
};

asts.inline_eq.w_prepare = function() {
    var left = this.left;
    var right = this.right;

    var left_type = left.get_type();
    var right_type = right.get_type();

    if ( left === TYPE.BOOLEAN || right === TYPE.BOOLEAN ) {
        left.cast( TYPE.BOOLEAN );
        right.cast( TYPE.BOOLEAN );
    } else {
        left.cast( TYPE.SCALAR );
        right.cast( TYPE.SCALAR );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_rel = {};

asts.inline_rel.options = {
    base: 'inline_binop'
};

asts.inline_rel._get_type = function() {
    return TYPE.BOOLEAN;
};

asts.inline_rel.w_prepare = function() {
    this.left.cast( TYPE.SCALAR );
    this.right.cast( TYPE.SCALAR );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_add = {};

asts.inline_add.options = {
    base: 'inline_binop'
};

asts.inline_add._get_type = function() {
    return TYPE.NUMBER;
};

asts.inline_add.w_prepare = function() {
    this.left.cast( TYPE.NUMBER );
    this.right.cast( TYPE.NUMBER );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_mul = {};

asts.inline_mul.options = {
    base: 'inline_binop'
};

asts.inline_mul._get_type = function() {
    return TYPE.NUMBER;
};

asts.inline_mul.w_prepare = function() {
    this.left.cast( TYPE.NUMBER );
    this.right.cast( TYPE.NUMBER );
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  FIXME: Подумать еще, а нужен ли этот оператор?
//
asts.inline_union = {};

asts.inline_union.options = {
    base: 'inline_binop'
};

asts.inline_union._get_type = function() {
    return TYPE.ARRAY;
};

asts.inline_union.w_prepare = function() {
    this.left.cast( TYPE.ARRAY );
    this.right.cast( TYPE.ARRAY );
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

asts.inline_unary._get_type = function() {
    return TYPE.NUMBER;
};

asts.inline_unary.w_prepare = function() {
    this.left.cast( TYPE.NUMBER );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_not = {};

asts.inline_not.options = {
    base: 'inline_unop'
};

asts.inline_not._get_type = function() {
    return TYPE.BOOLEAN;
};

asts.inline_not.w_prepare = function() {
    this.left.cast( TYPE.BOOLEAN );
};

//  #### Inline primaries
//  ---------------------------------------------------------------------------------------------------------------  //

asts.true = {};

asts.true._get_type = function() {
    return TYPE.BOOLEAN;
};

asts.false = {};

asts.false._get_type = function() {
    return TYPE.BOOLEAN;
};


//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_number = {};

asts.inline_number.options = {
    base: 'inline_expr',
    props: 'value'
};

asts.inline_number._get_type = function() {
    return TYPE.NUMBER;
};

asts.inline_number.is_const = no.true;

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_subexpr = {};

asts.inline_subexpr.options = {
    base: 'inline_expr',
    props: 'expr'
};

asts.inline_subexpr._get_type = function() {
    return this.expr.get_type();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_var = {};

asts.inline_var.options = {
    base: 'inline_expr',
    props: 'name'
};

asts.inline_var.w_action = function() {
    var name = this.name;

    var def = this.scope.find_var( name );
    if ( !def ) {
        this.error( {
            id: 'UNDEFINED_VAR',
            name: name,
            msg: 'Undefined variable ' + JSON.stringify( name )
        } );
    }

    this.def = def;
};

asts.inline_var._get_type = function() {
    return this.def.get_type();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func = {};

asts.inline_func.options = {
    base: 'inline_expr',
    props: 'name args'
};

asts.inline_func._get_type = function() {
    return this.def.get_type();
};

asts.inline_func.w_action = function() {
    var name = this.name;

    var def = this.scope.find_func( name );
    if ( !def ) {
        this.error( {
            id: 'UNDEFINED_FUNC',
            name: name,
            msg: 'Undefined function ' + JSON.stringify( name )
        } );
    }

    this.def = def;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_func_args = {};

asts.inline_func_args.options = {
    mixin: 'collection'
};

asts.inline_func_args.teya__sep = ', ';

asts.inline_func_arg = {};

asts.inline_func_arg.options = {
    props: 'name value'
};

asts.inline_func_arg._get_type = function() {
    return this.value.get_type();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_ternary = {};

asts.inline_ternary.options = {
    base: 'inline_expr',
    props: 'condition then else'
};

asts.inline_ternary._get_type = function() {
    return types.common_type( this.then.get_type(), this.else.get_type() );
};


//  ##### Inline stirng
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_string = {};

asts.inline_string.options = {
    base: 'inline_expr',
    props: 'value'
};

asts.inline_string._get_type = function() {
    return TYPE.STRING;
};

asts.inline_string.oncast = function( to ) {
    this.value.cast( to );
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.string_content = {};

asts.string_content.options = {
    mixin: 'collection'
};

asts.string_content.teya__sep = '';
asts.string_content.js__sep__cast = ' + ';

//  ---------------------------------------------------------------------------------------------------------------  //

asts.string_expr = {};

asts.string_expr.options = {
    base: 'inline_expr',
    props: 'expr'
};

asts.string_expr._get_type = function() {
    return this.expr.get_type();
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.string_literal = {};

asts.string_literal.options = {
    base: 'inline_expr',
    props: 'value'
};

asts.string_literal._get_type = function() {
    return TYPE.STRING;
};

asts.string_literal.stringify = function() {
    var value = ( this.to_type ) ? R[ 'to_' + this.to_type ]( this.value ) : this.value;

    return value
        .replace( /"/g, '\\"', 'g' )
        .replace( /'/g, "\\'", 'g' )
        .replace( /\n/g, '\\n', 'g' );
};

asts.string_literal.is_const = no.true;

//  #### JPath
//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath = {};

asts.jpath.options = {
    base: 'inline_expr',
    props: 'abs steps in_context'
};

asts.jpath._get_type = function() {
    return TYPE.JSON;
};

//  ---------------------------------------------------------------------------------------------------------------  //

asts.jpath_steps = {};

asts.jpath_steps.options = {
    mixin: 'collection'
};

asts.jpath_steps.teya__sep = '';

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

asts.jpath_filter._get_type = function() {
    return TYPE.JSON;
};

asts.jpath_filter.w_prepare = function() {
    this.expr.cast( TYPE.JSON );
};


//  #### Inline misc
//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_pairs = {};

asts.inline_pairs.options = {
    mixin: 'items'
};

asts.inline_pairs.teya__sep = ', ';
asts.inline_pairs.js__sep__output = '\n';

asts.inline_pairs.is_inline = no.true;

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_pair = {};

asts.inline_pair.options = {
    props: 'key value'
};

asts.inline_pair._init_props = function( pair ) {
    this.key = pair.key;
    this.value = pair.value;
};

asts.inline_pair._get_type = function() {
    return TYPE.PAIR;
};

asts.inline_pair.w_prepare = function() {
    this.key.cast( TYPE.SCALAR );
    this.value.cast();
};

asts.inline_pair.is_inline = no.true;

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_items = {};

asts.inline_items.options = {
    mixin: 'items'
};

asts.inline_items.teya__sep = ', ';
asts.inline_items.js__sep__output = '\n';

asts.inline_items.is_inline = true;

//  ---------------------------------------------------------------------------------------------------------------  //

asts.inline_item = {};

asts.inline_item.options = {
    props: 'value'
};

asts.inline_item._init_props = function( value ) {
    this.value = value;
};

asts.inline_item._get_type = function() {
    return TYPE.ITEM;
};

asts.inline_item.is_inline = no.true;


//  ---------------------------------------------------------------------------------------------------------------  //

asts.close_attrs = {};

asts.close_attrs.options = {
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = asts;

//  ---------------------------------------------------------------------------------------------------------------  //

