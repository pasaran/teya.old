var no = require( 'nommon' );

require( 'no.colors' );

var teya = require( './teya.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var messages = {
    METHOD_NOT_IMPLEMENTED: 'Method %method() not implemented in ast.%id',
    WRONG_TYPE: 'Invalid type. Should be "%expected". Found "%found"',
    TOKEN_EXPECTED: 'Token "%token" expected',
    TOKENS_EXPECTED: 'Tokens expected: %tokens',
    CAST_ERROR: 'Cannot convert from "%from" to "%to"',
    WRONG_TYPES: 'Incompatible types: "%type_a" (id="%id_a") and "%type_b" (id="%id_b")',
    TEMPLATE_REDEFINITION: 'Re-definition of template "%name"',
    VAR_REDEFINITION: 'Re-definition of variable "%name"',
    FUNC_REDEFINITION: 'Re-definition of function "%name"',
    AMBIGUOUS_DEFINITION: 'Ambiguous signature. Can\'t choose between "%one" and "%two"',
    UNTYPED_RECURSION: 'Recursive function without type declaration',
    UNDEFINED_VAR: 'Undefined variable "%name"',
    UNDEFINED_FUNC: 'Undefined function "%name"',
    UNMATCHED_TOKEN: 'Unmatched token "%token"',
    WRONG_DEDENT: 'Wrong dedent',
    UNEXPECTED_TOKEN: 'Unexpected token',
    TYPE_NAME_REQUIRED: 'Type name required',
    UNKNOWN_ARG_TYPE: 'Undefined argument type',
    TOO_MANY_PARAMS: 'Too many params',
    NO_SUCH_ARGUMENT: 'Argument "%name" not defined',
    PARAM_ALREADY_USED: 'Param "%name" already used',
    ARG_NOT_DEFINED: 'Argument not defined',
    DEFAULT_VALUE_REQUIRED: 'Default value required',
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Terror = function( id, params, pos ) {
    this.id = id;
    this.params = params;
    this.pos = pos;
};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.Terror.prototype.toString = function() {
    var message = messages[ this.id ] || 'Unknown error';
    var params = this.params || {};

    message = message.replace( /%(\w+)/g, function( _, name ) {
        return params[ name ] || '';
    } );

    var pos = this.pos;

    var input = pos.input;
    var filename = pos.filename;

    var lines = input.split( '\n' );

    var x = pos.x;
    var y = pos.y;

    //  На сколько нужно выравнивать номера строк (зависит от числа строк в файле).
    var left_padding = Math.floor( Math.log( lines.length ) / Math.LN10 ) + 1;

    var context = '';
    //  Склеиваем 5 строк, включая строку, на которой произошла ошибка.
    //  И строке выше нее.
    //  В начало строки выводим номера строк.
    //
    for ( var i = y - 4; i <= y; i++ ) {
        if ( i >= 0 ) {
            context += no.string.pad_left( i + 1, left_padding, ' ' ).blue + '  ';
            context += ( lines[ i ] || '' );
            context += '\n';
        }
    }

    //  Строим сообщение об ошибке.
    var error = '\n';

    //  Где произошла ошибка. Имя файла (если есть), координаты.
    error += 'at ';
    if ( filename ) {
       error += filename.green + ' ';
    }
    error += '(line: ' + ( y + 1 ).toString().green + ' col: ' + ( x + 1 ).toString().green + ')\n';

    //  Контекст ошибки. Т.е. сама строка с ошибкой и несколько строк до нее.
    error += context;
    //  Указатель на место ошибки в строке.
    error += Array( left_padding + x + 3 ).join( ' ' ) + '^'.red + '\n';
    //  Сама сообщение об ошибке.
    error += message.red.bold + '\n\n';

    return error;
};

//  ---------------------------------------------------------------------------------------------------------------  //

