var no = require( 'nommon' );

//  ---------------------------------------------------------------------------------------------------------------  //

function gen_ctors( base, asts ) {
    var ctors = {
        '': base
    };

    for (var id in asts ) {

        var ctor = function( pos, params ) {
            this.pos = pos;

            //  FIXME: Померять, что быстрее, иметь в _init null или no.op?
            if ( this._init ) {
                this._init();
            }

            if ( this._init_props && ( params !== undefined ) ) {
                this._init_props( params );
            }
        };

        var methods = asts[ id ] || {};
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
        //  FIXME: Нехорошо. Пока что это нужно для `AST.prototype.is`.
        proto.ctors = ctors;

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

    return ctors;
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

module.exports = gen_ctors;

//  ---------------------------------------------------------------------------------------------------------------  //

