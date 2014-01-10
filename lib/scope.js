var Scope = function( parent ) {
    this.parent = parent || null;

    this.defs = {};
};

//  ---------------------------------------------------------------------------------------------------------------  //

Scope.prototype.add_def = function( def ) {
    var name = def.name;

    var defs = this.defs;
    if ( defs[ name ] ) {
        def.error( 'Повторное определение: ' + name );
    }

    defs[ name ] = def;
};

//  ---------------------------------------------------------------------------------------------------------------  //

Scope.prototype.find = function( name ) {
    var scope = this;

    while ( scope ) {
        var def = scope.defs[ name ];
        if ( def ) {
            return def;
        }

        scope = scope.parent;
    }
};

Scope.prototype.is_template = function( name ) {
    var def = this.find( name );

    return ( def && def.is( 'def_template' ) );
};

Scope.prototype.is_var = function( name ) {
    var def = this.find( name );

    return ( def && def.is( 'def_var' ) );
};

Scope.prototype.is_func = function( name ) {
    var def = this.find( name );

    return ( def && def.is( 'def_func' ) );
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = Scope;

//  ---------------------------------------------------------------------------------------------------------------  //

