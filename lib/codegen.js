var fs_ = require( 'fs' );

//  ---------------------------------------------------------------------------------------------------------------  //

function add_templates( asts, base, lang ) {
    var modes = compile_templates( lang );

    for ( var mode in modes ) {
        ( function( mode, method ) {
            var method_key = lang + '__' + mode;
            var sep_key = lang + '__sep' + ( ( mode ) ? '__' + mode : '' );

            base.prototype[ method_key ] = function() {
                return method( this ) || '';
            };

            asts.items[ method_key ] = function() {
                var r = method( this );
                if ( r != null ) {
                    return r;
                }

                var items = this.items;
                var sep = this[ sep_key ] || '';

                r = '';
                for ( var i = 0, l = items.length; i < l; i++ ) {
                    var item = items[ i ];

                    if ( i ) {
                        r += sep;
                    }
                    r += item[ method_key ]();
                }

                return r;
            };
        } )( mode, modes[ mode ] );
    }

    base.prototype[ lang ] = base.prototype[ lang + '__' ];
    asts.items[ lang ] = asts.items[ lang + '__' ];

}

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_comments = /^#.*\n/gm;
var rx_templates = /^\S.*\n(\n|    .*\n)+/gm;
var rx_template = /^([\w-]+|\*)\ *(?::([\w-]+))?\ *(?:\[(.*)\])?\n([\S\s]*)$/;

function compile_templates( lang ) {
    var filename = process.cwd() + '/templates/' + lang + '.tmpl';
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
        //      item :content [ this.count > 0 ]
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

        var mode_templates = templates[ mode ] || (( templates[ mode ] = [] ));

        mode_templates.push( {
            id: id,
            predicate: predicate,
            body: compile_template( lang, body )
        } );
    }

    var js = 'var modes = {}\n';

    for ( var mode in templates ) {
        js += 'modes["' + mode + '"]=function(ast){\n';
        js += 'if(typeof ast!=="object")return ast==null?"":ast;\n';
        js += 'var id=ast.id,r="",l;\n';

        var mode_templates = templates[ mode ];
        for ( var i = 0, l = mode_templates.length; i < l; i++ ) {
            var template = mode_templates[ i ];

            js += ( i ) ? 'else if' : 'if';
            var condition = '';
            if ( template.id !== '*' ) {
                condition += 'id==="' + template.id + '"';
            }
            if ( template.predicate ) {
                condition += '&&(' + template.predicate + ')';
            }
            if ( !condition ) {
                condition = 'true';
            }
            js += '(' + condition + '){\n';
            js += template.body;
            js += 'return r?r.replace(/^\\n+/,"").replace(/\\n+$/,""):"";\n';
            js += '}\n';
        }

        js += '};\n\n';
    }

    js += 'return modes;';
    //  console.log(js);

    return new Function( 'macro', js )( macro );
}

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_line = /^(\s*)(.*)$/;
var rx_has_macro = /%(?:.|~|{|\w)/;

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
                js += 'if(l!==""){r+=l.replace(/^/gm,' + JSON.stringify( indent ) + ')+"\\n";}\n';
            } else {
                js += 'if(l!==""){r+=l+"\\n";}\n';
            }
        } else {
            js += 'r+=' + JSON.stringify( line ) + '+"\\n";\n';
        }
    }

    return js;
}

//  ---------------------------------------------------------------------------------------------------------------  //

var rx_macros = /(%(?:\.|~?(?:\w+(?:\.\w+)*)|~)(?::\w+|\(\))?|%{(?:\.|~?(?:\w+(?:\.\w+)*)|~)(?::\w+|\(\))?})/g;

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

    return compiled.join( '+' );
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  Макро может быть вида:
//
//      %.                  macro( ast, 'js__' )
//      %.:quu              macro( ast, 'js__quu' )
//
//      %~                  macro( ast.parent, 'js__' )
//      %~:quu              macro( ast.parent, 'js__quu' )
//
//      %~foo               macro( ast.parent.foo, 'js__' )
//      %~foo.bar           macro( ast.parent.foo.bar, 'js__' )
//      %~foo()             ast.parent.foo()
//      %~foo.bar()         ast.parent.foo.bar()
//      %~foo:quu           macro( ast.parent.foo, 'js__quu' )
//      %~foo.bar:quu       macro( ast.parent.foo.bar, 'js__quu' )
//
//      %foo                macro( ast.foo, 'js__' )
//      %foo.bar            macro( ast.foo.bar, 'js__' )
//      %foo()              ast.foo()
//      %foo.bar()          ast.foo.bar()
//      %foo:quu            macro( ast.foo, 'js__quu' )
//      %foo.bar:quu        macro( ast.foo.bar, 'js__quu' )
//

function macro( ast, method ) {
    if ( typeof ast !== 'object' ) {
        return ( ast == null ) ? '' : ast;
    }

    return ast[ method ]();
}

var rx_macro = /^%{?(\.|~?(?:\w+(?:\.\w+)*)|~)(?::(\w+))?(\(\))?}?$/;

function compile_macro( lang, macro ) {
    var parts = rx_macro.exec( macro );

    var path = parts[ 1 ];
    var mode = parts[ 2 ] || '';
    var is_call = parts[ 3 ];

    if ( path === '.' ) {
        path = '';
    }

    var js = 'ast';
    if ( path.charAt( 0 ) === '~' ) {
        js += '.parent';
        path = path.substr( 1 );
    }
    if ( path ) {
        js += '.' + path;
    }

    if ( is_call ) {
        js += '()';

    } else {
        js = 'macro(' + js + ',"' + lang + '__' + mode + '")';
    }

    return js;
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = add_templates;

//  ---------------------------------------------------------------------------------------------------------------  //

