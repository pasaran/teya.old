var no = require( 'nommon' );
require( 'no.colors' );

//  ---------------------------------------------------------------------------------------------------------------  //

var teya = {};

//  ---------------------------------------------------------------------------------------------------------------  //

teya.error = function( error, pos ) {
    throw new teya.Error( error, pos );
};

teya.Error = function( error, pos ) {
    this.error = error;
    this.pos = pos;
};

teya.Error.prototype.toString = function() {
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
    error += this.error.msg.red.bold + '\n\n';

    return error;
};

teya.Error.prototype.throw = function() {
    throw new Error( this.toString() );
};

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = teya;

//  ---------------------------------------------------------------------------------------------------------------  //

