var Scope = function( parent ) {
    this.parent = parent || null;

    this.templates = {};
    this.functions = {};
    this.vars = {};
};

Scope.prototype.create = function() {
    return new Scope( this );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Scope.prototype.find_var = function( name ) {
    var scope = this;

    while ( scope ) {
        var def = scope.vars[ name ];
        if ( def ) {
            return def;
        }

        scope = scope.parent;
    }
};

Scope.prototype.find_func = function( name ) {
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

module.exports = Scope;

//  ---------------------------------------------------------------------------------------------------------------  //

