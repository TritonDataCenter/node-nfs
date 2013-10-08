///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var RpcMessage = require('./message').RpcMessage;



///--- Globals

var sprintf = util.format;



///--- API

function RpcProgramMismatchReply(opts) {
    assert.object(opts, 'options');
    assert.number(opts.version, 'options.version');

    RpcMessage.call(this, opts);

    this.low = opts.version;
    this.high = opts.version;
}
util.inherits(RpcProgramMismatchReply, RpcMessage);


RpcProgramMismatchReply.prototype._transform = function (_, __, cb) {
    cb(new Error('RpcProgramMismatchReply._transform: not implemented!'));
};


RpcProgramMismatchReply.prototype._flush = function (cb) {
    var b = new Buffer(4 + 24 + 8);
    var offset = 4;

    b.writeUInt8(0x80, 0, true);
    b.writeUInt16BE(0x00, 1, true);
    b.writeUInt8(32, 3, true);
    b.writeUInt32BE(this.xid, offset, true);
    offset += 4;
    b.writeUInt32BE(1, offset, true); // reply
    offset += 4;
    b.writeUInt32BE(0, offset, true); // accepted
    offset += 4;
    b.writeDoubleBE(0x00000000, offset, true); // verifier
    offset += 8;
    b.writeUInt32BE(2, offset, true); // prog_mimatch
    offset += 4;
    b.writeUInt32BE(this.low, offset, true);
    offset += 4;
    b.writeUInt32BE(this.high, offset, true);

    this.push(b);
    cb();
};


RpcProgramMismatchReply.prototype.toString = function () {
    var fmt = '[object RpcProgramMismatchReply <xid=%d>]';
    return (sprintf(fmt, this.xid));
};



///--- Exports

module.exports = {
    RpcProgramMismatchReply: RpcProgramMismatchReply
};
