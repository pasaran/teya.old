var teya = require( './teya.js' );
require( './types.js' );

var TYPE = teya.types;

module.exports = [

    //  slice( "foo", 2, 3 )
    {
        name: 'slice',
        type: TYPE.STRING,
        args: [ TYPE.STRING, TYPE.NUMBER, TYPE.NUMBER ]
    },
    //  slice( "foo, 2 )
    {
        name: 'slice',
        type: TYPE.STRING,
        args: [ TYPE.STRING, TYPE.NUMBER ]
    },

];

