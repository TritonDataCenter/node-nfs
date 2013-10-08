///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var RpcMessage = require('./message').RpcMessage;



///--- Globals

var sprintf = util.format;



///--- API

function RpcMismatchReply(opts) {
    assert.object(opts, 'options');

    RpcMessage.call(this, opts);

    this.low = opts.low || 2;
    this.high = opts.high || 2;
}
util.inherits(RpcMismatchReply, RpcMessage);


RpcMismatchReply.prototype._transform = function (_, __, cb) {
    cb(new Error('RpcMismatchReply._transform: not implemented!'));
};


RpcMismatchReply.prototype._flush = function (cb) {
    var b = new Buffer(4 + 24);
    var offset = 4;

    b.writeUInt8(0x80, 0, true);
    b.writeUInt16BE(0x00, 1, true);
    b.writeUInt8(24, 3, true);
    b.writeUInt32BE(this.xid, offset, true);
    offset += 4;
    b.writeUInt32BE(1, offset, true);
    offset += 4;
    b.writeUInt32BE(1, offset, true);
    offset += 4;
    b.writeUInt32BE(0, offset, true);
    offset += 4;
    b.writeUInt32BE(this.low, offset, true);
    offset += 4;
    b.writeUInt32BE(this.high, offset, true);

    this.push(b);
    cb();
};


RpcMismatchReply.prototype.toString = function () {
    var fmt = '[object RpcMismatchReply <xid=%d, low=%d, high=%d>]';
    return (sprintf(fmt, this.xid, this.low, this.high));
};



///--- Exports

module.exports = {
    RpcMismatchReply: RpcMismatchReply
};
