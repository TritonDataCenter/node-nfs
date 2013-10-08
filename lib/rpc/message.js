///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');



///--- Globals

var sprintf = util.format;



///--- API

function RpcMessage(opts) {
    assert.object(opts, 'options');
    assert.number(opts.xid, 'options.xid');

    stream.Transform.call(this, opts);

    this.xid = opts.xid;
}
util.inherits(RpcMessage, stream.Transform);


RpcMessage.prototype.toString = function toString() {
    return (sprintf('[object RpcMessage <xid=%d>]', this.xid));
};




///--- Exports

module.exports = {
    RpcMessage: RpcMessage
};
