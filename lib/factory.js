var no = require( 'nommon' );

var teya = require( './teya.js' );
require( './ast.js' );
require( './asts.js' );

var add_templates = require( './codegen.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

function Factory( base, asts ) {
    var ctors = this.ctors = {
        '': base
    };

    for (var id in asts ) {
        var methods = asts[ id ] || {};

        if ( id === 'ast' ) {
            //  Дополнительные методы и свойства базового класса.
            //
            no.extend( base.prototype, methods );

            continue;
        }

        var ctor = function( pos, params ) {
            this.pos = pos;

            this._init( params );
        };

        var options = (( methods.options = methods.options || {} ));

        var base = ctors[ options.base || '' ];

        var mixin;
        if ( options.mixin ) {
            mixin = options.mixin.split( ' ' )
                .map( function( id ) {
                    //  FIXME: А что тут правильно написать-то?
                    //  return asts[ id ];
                    return ctors[ id ].prototype;
                } );
        } else {
            mixin = [];
        }
        mixin.push( methods );

        no.inherit( ctor, base, mixin );

        var proto = ctor.prototype;

        proto.id = id;
        proto.factory = this;

        var props;
        if ( options.props ) {
            //  Список свойств указан в options.
            props = options.props.split( ' ' );
        } else {
            //  Пытаемся достать список свойств из предка.
            props = base.prototype.options && base.prototype.options.props;
        }
        if ( props ) {
            //  Сохраняем список свойств в виде массива в `options`.
            options.props = props;

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

        ctors[ id ] = ctor;
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

Factory.prototype.ast = function( id, pos, params ) {
    var ctor = this.ctors[ id ];

    if ( !ctor ) {
        //  ERROR:
    }

    return new ctor( pos, params );
};

Factory.prototype.is = function( ast, id ) {
    if ( !this.ctors[ id ] ) {
        console.log( 'No ctor for %s', id );
    }
    return ast instanceof this.ctors[ id ];
};

//  ---------------------------------------------------------------------------------------------------------------  //

function gen_apply( props ) {
    var r = 'var v;';
    for ( var i = 0, l = props.length; i < l; i++ ) {
        var prop = JSON.stringify( props[ i ] );

        r += 'v = this[ ' + prop + ' ];';
        r += 'if ( v && typeof v === "object" ) { callback( v, params ); }';
    }

    return Function( 'callback', 'params', r );
}

//  ---------------------------------------------------------------------------------------------------------------  //

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

//  ---------------------------------------------------------------------------------------------------------------  //

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

teya.factory = new Factory( teya.AST, teya.asts );

//  ---------------------------------------------------------------------------------------------------------------  //

