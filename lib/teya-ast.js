var no = require( 'nommon' );

var BaseAST = require( './ast.js' );
var types = require( './teya-types.js' );
var TYPE = types;

//  ---------------------------------------------------------------------------------------------------------------  //

var AST = function() {};

no.inherit( AST, BaseAST );

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.state = {
    tid: 0,
    vid: 0,
    fid: 0,
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.cid = 0;
AST.prototype.rid = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.w_def = no.nop;
AST.prototype.w_action = no.nop;
AST.prototype.w_prepare = no.nop;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype._get_type = function() {
    return TYPE.NONE;
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.cast = function( to ) {
    var from = this.get_type();
    to = to || from;

    this.oncast( to );

    if ( from !== to ) {
        if ( !types.is_castable( from, to ) ) {
            this.error( {
                id: 'CAST_ERROR',
                from: from,
                to: to,
                msg: 'Cannot convert from ' + JSON.stringify( from ) + ' to ' + JSON.stringify( to )
            } );
        }

        this.as_type = to;
    }
};

AST.prototype.oncast = no.nop;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.teya = function() {
    throw Error( 'Method teya() not implemented in ' + this.id );
};


//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = AST;

//  ---------------------------------------------------------------------------------------------------------------  //

