var fs_ = require( 'fs' );

//  ---------------------------------------------------------------------------------------------------------------  //

function add_templates( asts, base, lang, filename ) {
    var templates = compile_templates( lang, filename );

    base.prototype[ lang ] = function() {
        return '';
    };

    base.prototype[ lang + '_macro' ] = function( id, mode ) {
        var value = this[ id ];

        if ( typeof value === 'object' ) {
            return value[ lang ]( mode || '' );

        } else {
            return ( value == null ) ? '' : value;
        }
    };

    base.prototype[ lang + '_default' ] = function() {
        return '';
    };

    asts.items[ lang ] = function( mode ) {
        return this[ lang + '_default' ]( mode || '' );
    };

    asts.items[ lang + '_default' ] = function( mode ) {
        mode = mode || '';

        var items = this.items;

        var sep = this[ lang + '_sep' + ( ( mode ) ? '_' + mode : '' ) ] || '';

        var r = '';
        for ( var i = 0, l = items.length; i < l; i++ ) {
            var item = items[ i ];

            if ( i ) {
                r += sep;
            }
            r += item[ lang ]( mode );
        }

        return r;
    };

    for ( var id in templates ) {
        if ( !asts[ id ] || asts[ id ][ lang ] ) {
            continue;
        }

        asts[ id ][ lang ] = templates[ id ];
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_comments = /^#.*\n/gm;
var rx_templates = /^\S.*\n(\n|    .*\n)+/gm;
var rx_template = /^([\w-]+|\*)\ *(?::([\w-]+))?\ *(?:\[(.*)\])?\n([\S\s]*)$/;

function compile_templates( lang, filename ) {
    var content = fs_.readFileSync( filename, 'utf-8' );

    //  Удаляем комментарии -- строки, начинающиеся на #.
    content = content.replace( rx_comments, '' );

    // Разбиваем на отдельные шаблоны.
    var parts = content.match( rx_templates );

    var templates = {};

    for ( var i = 0, l = parts.length; i < l; i++ ) {
        var part = parts[ i ];

        //  Каждый шаблон устроен следующим образом:
        //
        //      description
        //          body
        //
        //  description -- это одна строка, состоящая из имени шаблона, моды и предиката. Например:
        //
        //      item :content [ this.Count > 0 ]
        //
        //  При этом только имя обязательно
        //
        //  body -- это текст, состоящий либо из пустых строк, либо из строк, отбитых четырьмя пробелами.

        var r = rx_template.exec( part );
        if ( !r ) {
            throw new Error( 'Ошибка синтаксиса шаблона:\n' + part );
        }

        var id = r[ 1 ];
        var mode = r[ 2 ] || '';
        var predicate = ( r[ 3 ] || '' ).trim();
        var body = r[ 4 ];

        //  Убираем отступ и переводы строк.
        body = body.replace( /^    /gm, '' )
            .replace( /^\n+/, '' )
            .replace( /\n+$/, '' );

        var id_templates = templates[ id ] || (( templates[ id ] = {} ));
        var mode_templates = id_templates[ mode ] || (( id_templates[ mode ] = [] ));

        mode_templates.push( {
            predicate: predicate,
            body: compile_template( lang, body )
        } );
    }

    var compiled = {};

    var star_templates = templates[ '*' ] || {};

    for ( var id in templates ) {
        if ( id === '*' ) {
            continue;
        }

        var js = 'mode = mode || "";';
        js += 'var r, l;\n';
        js += 'switch (mode) {\n';

        var id_templates = templates[ id ];
        for ( var mode in id_templates ) {
            var mode_templates = id_templates[ mode ].concat( star_templates[ mode ] || [] );

            js += 'case ' + JSON.stringify( mode ) + ':\n';
            js += 'r = "";\n';

            for ( var i = 0, l = mode_templates.length; i < l; i++ ) {
                var template = mode_templates[ i ];

                if ( template.predicate ) {
                    js += 'if (' + template.predicate + ') {\n' + template.body + '}\n';
                } else {
                    js += template.body;
                }
            }

            js += 'break;\n';
        }

        js += 'default: return this.' + lang + '_default(mode);';
        js += '}';
        js += 'return "";\n';

        //  console.log( id.green.bold );
        //  console.log( js, '\n\n' );

        compiled[ id ] = new Function( 'mode', js );
    }

    return compiled;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_line = /^(\s*)(.*)$/;
var rx_has_macro = /%(?:.|~|\w)/;

function compile_template( lang, template ) {
    var lines = template.split( '\n' );

    var js = '';

    for ( var i = 0, l = lines.length; i < l; i++ ) {
        var line = lines[ i ];

        if ( rx_has_macro.test( line ) ) {
            var r = rx_line.exec( line );

            var indent = r[ 1 ];
            var content = r[ 2 ];

            js += 'l = ' + compile_line( lang, content ) + ';\n';
            if ( indent ) {
                js += 'if ( l !== "" ) { r += l.replace( /^/gm, ' + JSON.stringify( indent ) + ') + "\\n"; }\n';
            } else {
                js += 'if ( l !== "" ) { r += l + "\\n"; }\n';
            }
        } else {
            js += 'r += ' + JSON.stringify( line ) + ' + "\\n";\n';
        }
    }

    js += 'return r.replace( /^\\n+/, "" ).replace( /\\n+$/, "" );\n';

    return js;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_macros = /(%(?:\.|~?(?:\w+(?:\.\w+)*)|~)(?::\w+|\(\))?)/g;

function compile_line( lang, line ) {
    var parts = line.split( rx_macros );

    var compiled = [];

    for ( var i = 0, l = parts.length; i < l; i++ ) {
        if ( i % 2 ) {
            //  Это макро.
            var macro = parts[ i ];

            compiled.push( compile_macro( lang, macro ) );

        } else {
            //  Это строка.
            var str = parts[ i ];

            if ( str ) {
                compiled.push( JSON.stringify( str ) );
            }
        }
    }

    return compiled.join( ' + ' );
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Макро может быть вида:
//
//      %.                  this.js( '' )
//      %.:quu              this.js( '' )
//
//      %~                  this.parent.js( '' )
//      %~:quu              this.parent.js( '' )
//
//      %~foo               this.parent.js_macro( 'foo', '' )
//      %~foo.bar           this.parent.foo.js_macro( 'bar', '' )
//      %~foo()             this.parent.foo()
//      %~foo.bar()         this.parent.foo.bar()
//      %~foo:quu           this.parent.js_macro( 'foo', 'quu' )
//      %~foo.bar:quu       this.parent.foo.js_macro( 'bar', 'quu' )
//
//      %foo                this.js_macro( 'foo', '' )
//      %foo.bar            this.foo.js_macro( 'bar', '' )
//      %foo()              this.foo()
//      %foo.bar()          this.foo.bar()
//      %foo:quu            this.js_macro( 'foo', 'quu' )
//      %foo.bar:quu        this.foo.js_macro( 'bar', 'quu' )
//

var rx_macro = /^%(\.|~?(?:\w+(?:\.\w+)*)|~)(?::(\w+))?(\(\))?$/;

function compile_macro( lang, macro ) {
    var parts = rx_macro.exec( macro );

    var path = parts[ 1 ];
    var mode = JSON.stringify( parts[ 2 ] || '' );
    var is_call = parts[ 3 ];

    var js;
    if ( path === '.' || path === '~' ) {
        js = ( path === '.' ) ? 'this.' : 'this.parent.';
        js += lang;
        js += '(' + mode + ')';

    } else {
        if ( path.charAt( 0 ) === '~' ) {
            js = 'this.parent';
            path = path.substr( 1 );
        } else {
            js = 'this';
        }

        if ( is_call ) {
            js += '.' + path + '()';

        } else {
            path = path.split( '.' );
            var last = JSON.stringify( path.pop() );

            if ( path.length ) {
                js += '.' + path.join( '.' );
            }

            js += '.' + lang + '_macro(' + last + ',' +  mode + ')';
        }
    }

    return js;
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = add_templates;

//  ---------------------------------------------------------------------------------------------------------------  //

