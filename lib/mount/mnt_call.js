// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');



///--- Globals

var RpcCall = rpc.RpcCall;
var XDR = rpc.XDR;



///--- API

function MountMntCall(opts) {
    RpcCall.call(this, opts, true);

    this.dirpath = opts.dirpath || '';

    this._nfs_mount_mnt_call = true; // MDB
}
util.inherits(MountMntCall, RpcCall);


MountMntCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.dirpath = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
};


MountMntCall.prototype.writeHead = function writeHead() {
    var xdr = this._serialize(XDR.byteLength(this.dirpath));
    xdr.writeString(this.dirpath);

    this.write(xdr.buffer());
};


MountMntCall.prototype.toString = function toString() {
    var fmt = '[object MountMntCall <xid=%d, dirpath=%s>]';
    return (util.format(fmt, this.xid, this.dirpath));
};



///--- Exports

module.exports = {
    MountMntCall: MountMntCall
};
