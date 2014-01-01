var no = require( 'nommon' );

//  ---------------------------------------------------------------------------------------------------------------  //

function Factory( asts, base ) {
    this.asts = asts;
    this.ctors = {
        '': base
    };
}

//  ---------------------------------------------------------------------------------------------------------------  //

Factory.prototype.make = function( id, pos, params ) {
    var ctor = this.get( id );
    var ast = new ctor();

    //  Точка во входном потоке, соответствующая этому AST.
    ast.pos = pos;

    //  Вызываем "конструктор".
    //  Настоящий конструктор пустой для упрощения наследования.
    ast._init();

    //  Если переданы params, то вызываем "конструктор копии".
    if ( params && ast.copy ) {
        ast.copy( params );
    }

    return ast;
};

Factory.prototype.get = function( id ) {
    var ctor = this.ctors[ id ];

    if ( !ctor ) {
        ctor = function() {};

        var asts = this.asts;

        var methods = asts[ id ] || {};
        var options = (( methods.options = methods.options || {} ));

        var base = this.get( options.base || '' );

        var mixin;
        if ( options.mixin ) {
            mixin = options.mixin.split( ' ' )
                .map( function( id ) {
                    return asts[ id ];
                } );
        } else {
            mixin = [];
        }
        mixin.push( methods );

        no.inherit( ctor, base, mixin );

        var proto = ctor.prototype;

        proto.id = id;
        proto.factory = this;

        if ( options.props ) {
            var props = options.props.split( ' ' );

            if ( !methods.clone ) {
                proto.clone = gen_clone( props );
            }
            if ( !methods.copy ) {
                proto.copy = gen_copy( props );
            }
            if ( !methods.apply ) {
                proto.apply = gen_apply( props );
            }
            if ( !methods.dowalk ) {
                proto.dowalk = gen_dowalk( props );
            }
            if ( !methods.walkdo ) {
                proto.walkdo = gen_walkdo( props );
            }
        }

        this.ctors[ id ] = ctor;
    }

    return ctor;
};

//  ---------------------------------------------------------------------------------------------------------------  //

function gen_clone( props ) {
    var r = 'var v;';
    r += 'var ast = this.factory.make( this.id, this.pos );';

    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'ast[ ' + prop + ' ] = ( v && typeof v === "object" ) ? v.clone() : v;';
    }

    r += 'return ast;';

    return Function( r );
}

function gen_copy( props ) {
    var r = 'var v;';
    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = ast[ ' + prop + ' ];';
        r += 'if ( v != null ) { this[ ' + prop + ' ] = v; }';
    }

    return Function( 'ast', r );
}

function gen_apply( props ) {
    var r = 'var v;';
    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'if ( v && typeof v === "object" ) { callback( v, params ); }';
    }

    return Function( 'callback', 'params', r );
}

function gen_dowalk( props ) {
    var r = 'var v;';

    r += 'callback( this, params, pkey, pvalue );';

    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'if ( v && typeof v === "object" ) { v.dowalk( callback, params, ' + prop + ', this ); }';
    }

    return Function( 'callback', 'params', 'pkey', 'pvalue', r );
}

function gen_walkdo( props ) {
    var r = 'var v;';

    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'if ( v && typeof v === "object" ) { v.walkdo( callback, params, ' + prop + ', this ); }';
    }

    r += 'callback( this, params, pkey, pvalue );';

    return Function( 'callback', 'params', 'pkey', 'pvalue', r );
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = Factory;

//  ---------------------------------------------------------------------------------------------------------------  //

