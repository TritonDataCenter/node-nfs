///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var RpcMessage = require('./message').RpcMessage;



///--- Globals

var sprintf = util.format;



///--- API

function RpcProcedureUnavailableReply(opts) {
    assert.object(opts, 'options');
    RpcMessage.call(this, opts);
}
util.inherits(RpcProcedureUnavailableReply, RpcMessage);


RpcProcedureUnavailableReply.prototype._transform = function (_, __, cb) {
    cb(new Error('RpcProcedureUnavailableReply._transform: not implemented!'));
};


RpcProcedureUnavailableReply.prototype._flush = function _flush(cb) {
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
    b.writeUInt32BE(3, offset, true); // proc_unavail

    this.push(b);
    cb();
};


RpcProcedureUnavailableReply.prototype.toString = function () {
    var fmt = '[object RpcProcedureUnavailableReply <xid=%d>]';
    return (sprintf(fmt, this.xid));
};



///--- Exports

module.exports = {
    RpcProcedureUnavailableReply: RpcProcedureUnavailableReply
};
