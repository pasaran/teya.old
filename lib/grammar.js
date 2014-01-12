var Grammar = function( grammar ) {
    this.rules = grammar.rules;
    this.tokens = {};
    this.skippers = {};

    this.add_tokens( grammar.tokens );
    this.add_keywords( grammar.keywords );
    this.add_skippers( grammar.skippers );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Grammar.prototype.add_tokens = function( tokens ) {
    if ( !tokens ) {
        return;
    }

    for ( var id in tokens ) {
        this.tokens[ id ] = compile_token( tokens[ id ] );
    }
};

function compile_token( token ) {
    if ( typeof token === 'string' ) {
        var l = token.length;

        if ( l === 1 ) {
            return function( parser ) {
                return ( parser.line.charAt( 0 ) === token ) ? token : null;
            };

        } else {
            return function( parser ) {
                return ( parser.next( l ) === token ) ? token : null;
            };

        }
    }

    if ( token instanceof RegExp ) {
        return function( parser ) {
            var r = token.exec( parser.line );

            return ( r ) ? r[ 0 ] : null;
        };
    }

    //  Should be a function.
    return token;
}

//  ---------------------------------------------------------------------------------------------------------------  //

Grammar.prototype.add_keywords = function( keywords ) {
    if ( !keywords ) {
        return;
    }

    var that = this;

    //  NOTE: forEach тут нужен, чтобы создать замыкание.
    //
    keywords.forEach( function( keyword ) {
        var l = keyword.length;

        that.tokens[ keyword ] = function( parser ) {
            var line = parser.line;

            if ( line.substr( 0, l ) !== keyword ) {
                return null;
            }

            var c = line.charCodeAt( l );
            //  Смотрим, нет ли за найденной строкой чего-нибудь из [a-zA-Z0-9_-].
            if ( (c > 64 && c < 91) || (c > 96 && c < 123) || (c > 47 && c < 58) || c === 95 || c === 45 ) {
                return null;
            }

            return keyword;
        };
    } );
};

//  ---------------------------------------------------------------------------------------------------------------  //

Grammar.prototype.add_skippers = function( skippers ) {
    if ( !skippers ) {
        return;
    }

    for ( var id in skippers ) {
        this.skippers[ id ] = compile_skipper( id, skippers[ id ] );
    }
};

function compile_skipper( id, skipper ) {
    if ( skipper instanceof RegExp ) {
        return function( parser ) {
            var r = skipper.exec( parser.line );

            var s = r && r[ 0 ];
            if ( s ) {
                parser.move_x( s.length );
            }

            return s;
        };
    }

    //  Should be a function.
    return skipper;
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = Grammar;

//  ---------------------------------------------------------------------------------------------------------------  //

