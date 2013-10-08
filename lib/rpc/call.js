///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var RpcMessage = require('./message').RpcMessage;



///--- Globals

var sprintf = util.format;



///--- API

function RpcCall(opts, noSlice) {
    assert.object(opts, 'options');
    assert.optionalBool(noSlice, 'noSlice');

    RpcMessage.call(this, opts);
    this.rpc_rpcvers = opts.rpcvers;
    this.rpc_prog = opts.prog;
    this.rpc_vers = opts.vers;
    this.rpc_proc = opts.proc;
    this.rpc_auth = opts.auth;
    this.rpc_verifier = opts.verifier;

    if (!noSlice && opts.offset && opts.buffer)
        this.buffer = opts.buffer.slice(opts.offset);
}
util.inherits(RpcCall, RpcMessage);


RpcCall.prototype._transform = function _transform(chunk, encoding, cb) {
    this.push(chunk);
    cb();
};


RpcCall.prototype._flush = function _flush(cb) {
    cb();
};


RpcCall.prototype.toString = function toString() {
    return (sprintf('[object RpcCall <xid=%d, prog=%d, vers=%d, proc=%d>]',
                    this.xid, this.rpc_prog, this.rpc_vers, this.rpc_proc));
};



///--- Exports

module.exports = {
    RpcCall: RpcCall
};
