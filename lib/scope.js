var teya = require( './teya.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Scope = function( parent, root ) {
    this.parent = parent || null;
    this.root = root || this;

    this.templates = {};
    this.functions = {};
    this.vars = {};
};

teya.Scope.prototype.create = function() {
    return new teya.Scope( this, this.root );
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Scope.prototype.add_template = function( template, namespace ) {
    //  FIXME: Добавлять шаблон можно только в глобальный scope.
    var scope = this.root;
    var templates = scope.templates;

    var name = ( namespace ) ? namespace + '.' + template.name : template.name;

    if ( templates[ name ] ) {
        if (
            template.id === 'def_imported_template' &&
            templates[ name ].id === 'def_imported_template' &&
            template.pos.filename === templates[ name ].pos.filename
        ) {
            //  Это один и тот же шаблон, импортируемый два раза.
            //  Ничего не делаем.
            return;
        }

        template.error( 'TEMPLATE_REDEFINITION', { name: name } );
    }

    templates[ name ] = template;

    //  Мы действительно добавили шаблон. В первый раз.
    return true;
}

teya.Scope.prototype.find_template = function( name ) {
    var scope = this.root;

    return scope.templates[ name ];
};

teya.Scope.prototype.find_var = function( name ) {
    var scope = this;

    while ( scope ) {
        var def = scope.vars[ name ];
        if ( def ) {
            return def;
        }

        scope = scope.parent;
    }
};

teya.Scope.prototype.add_def_func = function( def_func ) {
    var name = def_func.name;
    var full_name = def_func.get_full_name();

    var funcs = this.functions[ name ] || (( this.functions[ name ] = {} ));
    if ( funcs[ full_name ] ) {
        def_func.error( 'FUNC_REDEFINITION', { name: full_name } );
    }

    funcs[ full_name ] = def_func;
};

teya.Scope.prototype.find_def_func = function( inline_func ) {
    var name = inline_func.name;
    var args = inline_func.args;

    var scope = this;

    var found = [];
    while ( scope ) {
        var funcs = scope.functions[ name ] || {};

        for ( var full_name in funcs ) {
            var func = funcs[ full_name ];
            if ( func.is_compatible_signature( args ) ) {
                found.push( func );

                if ( found.length > 1 ) {
                    break;
                }
            }
        }

        scope = scope.parent;
    }

    if ( !found.length ) {
        inline_func.error( 'UNDEFINED_FUNC', { name: name } );
    }

    if ( found.length > 1 ) {
        inline_func.error( 'AMBIGUOUS_DEFINITION', {
            one: found[ 0 ].get_full_name(),
            two: found[ 1 ].get_full_name()
        } );
    }

    return found[ 0 ];
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Scope.prototype.is_global = function() {
    return !this.parent;
};

//  ---------------------------------------------------------------------------------------------------------------  //

