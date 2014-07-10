var _terror = require( './terror.js' );

//  ---------------------------------------------------------------------------------------------------------------  //

var messages = {
    WRONG_TYPE: 'Invalid type. Should be "%expected". Found "%found"',
    TOKEN_EXPECTED: 'Token "%token" expected',
    TOKENS_EXPECTED: 'Tokens expected: %tokens',
    CAST_ERROR: 'Cannot convert from "%from" to "%to"',
    WRONG_TYPES: 'Incompatible types: "%type_a" (id="%id_a") and "%type_b" (id="%id_b")',
    TEMPLATE_REDEFINITION: 'Re-definition of template "%name"',
    VAR_REDEFINITION: 'Re-definition of variable "%name"',
    FUNC_REDEFINITION: 'Re-definition of function "%name"',
    UNTYPED_RECURSION: 'Recursive function without type declaration',
    UNDEFINED_VAR: 'Undefined variable "%name"',
    UNDEFINED_FUNC: 'Undefined function "%name"',
    UNMATCHED_TOKEN: 'Unmatched token "%token"',
    WRONG_DEDENT: 'Wrong dedent',
};

//  ---------------------------------------------------------------------------------------------------------------  //

function terror( id, params, pos ) {
    var message = messages[ id ] || '';

    message = message.replace( /%(\w+)/g, function( _, name ) {
        return params[ name ] || '';
    } );

    _terror( message, pos );
}

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = terror;

//  ---------------------------------------------------------------------------------------------------------------  //

