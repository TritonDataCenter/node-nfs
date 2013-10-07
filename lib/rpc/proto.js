var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');
var mod_clone = require('clone');


///--- Globals

var sprintf = util.format;



///--- Base API

function RpcMessage(opts) {
    assert.object(opts, 'options');
    assert.number(opts.xid, 'options.xid');

    stream.Transform.call(this, opts);

    this.xid = opts.xid;
}
util.inherits(RpcMessage, stream.Transform);



///--- RPC Call

function RpcCall(opts) {
    assert.object(opts, 'options');

    RpcMessage.call(this, opts);
    this.rpcvers = opts.rpcvers;
    this.prog = opts.prog;
    this.vers = opts.vers;
    this.proc = opts.proc;
    this.auth = opts.auth;
    this.verifier = opts.verifier;
    this.type = opts.type;
    this.type = 0;
}
util.inherits(RpcCall, RpcMessage);


RpcCall.prototype._transform = function (chunk, encoding, cb) {
    // XXX
    this.push(chunk);
    cb();
};


RpcCall.prototype._flush = function (cb) {
    // XXX
    cb();
};


RpcCall.prototype.toString = function toString() {
    var fmt = '[object RpcCall <xid=%d, prog=%d, vers=%d, proc=%d>]';
    return (sprintf(fmt, this.xid, this.prog, this.vers, this.proc));
};



///--- RpcReply

function RpcReply(opts) {
    RpcMessage.call(this, opts);
    this.name = 'RpcReply';
}
util.inherits(RpcReply, RpcMessage);


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
    b.writeDoubleBE(0x00000000, offset, true); // verifier
    offset += 8;
    b.writeUInt32BE(0, offset, true); // success
    offset += 4;

    return ({
        buffer: b,
        offset: offset
    });
};


RpcReply.prototype._transform = function (chunk, encoding, cb) {
    this.push(chunk);
    cb();
};


RpcReply.prototype._flush = function (cb) {
    this.push(this._buildHeader({length: 0}).buffer);
    cb();
};


RpcReply.prototype.toString = function () {
    var fmt = '[object RpcReply <xid=%d>]';
    return (sprintf(fmt, this.xid));
};

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
    RpcMessage: RpcMessage,
    RpcCall: RpcCall,
    RpcProgramUnavailableReply: RpcProgramUnavailableReply,
    RpcProgramMismatchReply: RpcProgramMismatchReply,
    RpcProcedureUnavailableReply: RpcProcedureUnavailableReply,
    RpcMismatchReply: RpcMismatchReply,
    RpcReply: RpcReply
};



/*
RpcReply.prototype.toBuffer = function toBuffer() {
    var b = new Buffer(24);
    b[0] = 0x80;
    b[1] = 0x00;
    b[2] = 0x00;
    b[3] = 0x18;

    b.writeUInt32BE(this.xid, 4, true);
    b.writeUInt32BE(1, 8, true); // type: reply
    b.writeInt32BE(0, 12, true); // type: accepted
    b.writeInt32BE(0, 16, true); // status: SUCCESS
    b.writeUInt32BE(0, 20, true); // verifier:type - NULL
    b.writeUInt32BE(0, 24, true); // verifier:len - 0

    // Protocol specific...
    return (b);
};
    // b[0] = 0x80;
    // b[1] = 0x00;
    // b[2] = 0x00;
    // b[3] = 0x18;

    // b.writeUInt32BE(this.xid, 4, true);
    // b.writeUInt32BE(1, 8, true); // type: reply
    // b.writeInt32BE(0, 12, true); // type: accepted
    // b.writeInt32BE(0, 16, true); // status: SUCCESS
    // b.writeUInt32BE(0, 20, true); // verifier:type - NULL
    // b.writeUInt32BE(0, 24, true); // verifier:len - 0

    // Protocol specific...
    // return (b);
    // console.log('???');

*/
