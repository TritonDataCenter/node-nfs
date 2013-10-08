///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var RpcReply = require('./reply').RpcReply;



///--- Globals

var sprintf = util.format;



///--- API

function RpcNullReply(opts) {
    RpcReply.call(this, opts);
    this.name = 'RpcNullReply';
}
util.inherits(RpcNullReply, RpcReply);


RpcNullReply.prototype._flush = function _flush(cb) {
    this.push(this._buildHeader({length: 0}).buffer);
    cb();
};


RpcNullReply.prototype.toString = function toString() {
    return (sprintf('[object RpcNullReply <xid=%d>]', this.xid));
};



///--- Exports

module.exports = {
    RpcNullReply: RpcNullReply
};
