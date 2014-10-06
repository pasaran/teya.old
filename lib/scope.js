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
        template.error( 'TEMPLATE_REDEFINITION', { name: name } );
    }

    templates[ name ] = template;
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

teya.Scope.prototype.find_func = function( name ) {
    var scope = this;

    while ( scope ) {
        var def = scope.functions[ name ];
        if ( def ) {
            return def;
        }

        scope = scope.parent;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Scope.prototype.is_global = function() {
    return !this.parent;
};

//  ---------------------------------------------------------------------------------------------------------------  //

