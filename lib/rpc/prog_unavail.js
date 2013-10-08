///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var RpcMessage = require('./message').RpcMessage;



///--- Globals

var sprintf = util.format;



///--- API

// enum accept_stat {
//     SUCCESS       = 0, /* RPC executed successfully       */
//     PROG_UNAVAIL  = 1, /* remote hasn't exported program  */
//     PROG_MISMATCH = 2, /* remote can't support version #  */
//     PROC_UNAVAIL  = 3, /* program can't support procedure */
//     GARBAGE_ARGS  = 4  /* procedure can't decode params   */
// };
//
function RpcProgramUnavailableReply(opts) {
    assert.object(opts, 'options');
    RpcMessage.call(this, opts);
}
util.inherits(RpcProgramUnavailableReply, RpcMessage);


RpcProgramUnavailableReply.prototype._transform = function (_, __, cb) {
    cb(new Error('RpcProgramUnavailableReply._transform: not implemented!'));
};


RpcProgramUnavailableReply.prototype._flush = function _flush(cb) {
    var b = new Buffer(4 + 16 + 8);
    var offset = 4;

    b.writeUInt8(0x80, 0, true);
    b.writeUInt16BE(0x00, 1, true);
    b.writeUInt8(24, 3, true);
    b.writeUInt32BE(this.xid, offset, true);
    offset += 4;
    b.writeUInt32BE(1, offset, true); // reply
    offset += 4;
    b.writeUInt32BE(0, offset, true); // accepted
    offset += 4;
    b.writeDoubleBE(0x00000000, offset, true); // verifier
    offset += 8;
    b.writeUInt32BE(1, offset, true); // prog_unavail

    this.push(b);
    cb();
};


RpcProgramUnavailableReply.prototype.toString = function toString() {
    var fmt = '[object RpcProgramUnavailableReply <xid=%d>]';
    return (sprintf(fmt, this.xid));
};



///--- Exports

module.exports = {
    RpcProgramUnavailableReply: RpcProgramUnavailableReply
};
