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
AST.prototype.nid = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.w_def = no.op;
AST.prototype.w_action = no.op;
AST.prototype.w_prepare = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype._get_type = function() {
    return TYPE.NONE;
};

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.cast = function( to ) {
    var from = this.get_type();
    to = to || from;
    //  console.log( 'CAST', this.id, from, to );

    if ( !types.is_castable( from, to ) ) {
        this.error( {
            id: 'CAST_ERROR',
            from: from,
            to: to,
            msg: 'Cannot convert from ' + JSON.stringify( from ) + ' to ' + JSON.stringify( to )
            //  FIXME:
            //  msg: 'Cannot convert from "%from" to "%to"'
        } );
    }

    if ( from !== to ) {
        this.from_type = from;
        this.to_type = to;
    }

    this.oncast( to );
};

AST.prototype.oncast = no.op;

//  ---------------------------------------------------------------------------------------------------------------  //

AST.prototype.is_inline = no.false;

//  ---------------------------------------------------------------------------------------------------------------  //

module.exports = AST;

//  ---------------------------------------------------------------------------------------------------------------  //

