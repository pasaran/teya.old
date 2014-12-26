var teya = require( './teya.js' );
require( './types.js' );

var TYPE = teya.types;

module.exports = [

    //  log( ...any ): none
    {
        name: 'log',
        type: TYPE.NONE,
        args: [ TYPE.REST( TYPE.ANY ) ]
    },

    //  slice( string, number, number ): string
    {
        name: 'slice',
        type: TYPE.STRING,
        args: [ TYPE.STRING, TYPE.NUMBER, TYPE.NUMBER ]
    },
    //  slice( string, number ): string
    {
        name: 'slice',
        type: TYPE.STRING,
        args: [ TYPE.STRING, TYPE.NUMBER ]
    },

];

