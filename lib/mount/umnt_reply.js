///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var RpcReply = require('../rpc').RpcReply;



///--- Globals

var sprintf = util.format;



///--- API

function MountdUmntReply(opts) {
    RpcReply.call(this, opts);
    this.name = 'MountdUmntReply';
}
util.inherits(MountdUmntReply, RpcReply);


MountdUmntReply.prototype._flush = function _flush(cb) {
    this.push(this._buildHeader({length: 0}).buffer);
    cb();
};


MountdUmntReply.prototype.toString = function toString() {
    return (sprintf('[object MountdUmntReply <xid=%d>]', this.xid));
};



///--- Exports

module.exports = {
    MountdUmntReply: MountdUmntReply
};
