///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var RpcMessage = require('./message').RpcMessage;



///--- Globals

var sprintf = util.format;



///--- API

function RpcReply(opts) {
    RpcMessage.call(this, opts);
    this.name = 'RpcReply';
}
util.inherits(RpcReply, RpcMessage);


/*
 * struct accepted_reply {
 *      opaque_auth verf
 *      union switch (accept_stat stat) {
 *      case SUCCESS:
 *          opaque results[0]
 *          // procedure-specific results start here
 *      case PROG_MISMATCH:
 *          struct {
 *              unsigned int low
 *              unsigned int high
 *          } mismatch_info
 *      default:
 *          // Void. cases include PROG_UNAVAIL, PROC_UNAVAIL, and GARBAGE_ARGS
 *          void;
 *      }
 * }
 */
RpcReply.prototype._buildHeader = function _buildHeader(opts) {
    assert.object(opts, 'options');
    assert.number(opts.length, 'length');

    var b = new Buffer(28 + opts.length);
    var offset = 4;

    b.writeUInt8(0x80, 0, true);
    b.writeUInt16BE(0x00, 1, true);
    b.writeUInt8(opts.length + 24, 3, true);
    b.writeUInt32BE(this.xid, offset, true);
    offset += 4;
    b.writeUInt32BE(1, offset, true); // reply
    offset += 4;
    b.writeUInt32BE(0, offset, true); // accepted
    offset += 4;
    b.writeDoubleBE(0x00000000, offset, true); // verifier XXX return input
    offset += 8;
    b.writeUInt32BE(0, offset, true); // success
    offset += 4;

    return ({
        buffer: b,
        offset: offset
    });
};


RpcReply.prototype._transform = function _transform(chunk, encoding, cb) {
    this.push(chunk);
    cb();
};


RpcReply.prototype._flush = function _flush(cb) {
    cb();
};


RpcReply.prototype.toString = function toString() {
    return (sprintf('[object RpcReply <xid=%d>]', this.xid));
};



///--- Exports

module.exports = {
    RpcReply: RpcReply
};
