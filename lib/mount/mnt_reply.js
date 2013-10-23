// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');



///--- Globals
var RpcReply = rpc.RpcReply;
var XDR = rpc.XDR;




///--- Helpers

function calculate_buffer_length(mappings) {
    assert.arrayOfObject(mappings, 'mappings');
    var sz = 0;
    mappings.forEach(function (m) {
        sz += 4; // boolean marker
        sz += XDR.byteLength(m.name);
        sz += XDR.byteLength(m.dirpath);
    });
    sz += 4; // final boolean marker

    return (sz);
}



///--- API

function MountMntReply(opts) {
    RpcReply.call(this, opts);

    this.fhs_status = 0;
    this.fhandle3 = '';
    this.auth_flavor = [1];

    this._nfs_mount_mnt_reply = true; // MDB
}
util.inherits(MountMntReply, RpcReply);


MountMntReply.prototype.setFileHandle = function setFileHandle(fh) {
    assert.string(fh, 'file_handle');

    this.fhandle3 = fh;

    if (this.fhandle3.length > 64)
        this.fhandle3.length = 64;

    return (this.fhandle3);
};


MountMntReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.fhs_status = xdr.readInt();
        if (this.fhs_status === 0) {
            this.fhandle3 = xdr.readString();
            this.auth_flavor = xdr.readIntArray();
        }
    } else {
        this.push(chunk);
    }

    cb();
};


MountMntReply.prototype.writeHead = function writeHead() {
    var len = 4;
    if (this.fhs_status === 0) {
        len += XDR.byteLength(this.fhandle3);
        len += XDR.byteLength(this.auth_flavor);
    }
    var xdr = this._serialize(len);

    xdr.writeInt(this.fhs_status);
    if (this.fhs_status === 0) {
        xdr.writeString(this.fhandle3);
        xdr.writeIntArray(this.auth_flavor);
    }

    this.write(xdr.buffer());
};


MountMntReply.prototype.toString = function toString() {
    var fmt = '[object MountMntReply <xid=%d, status=%d, fhandle3=%s>]';
    return (util.format(fmt, this.xid, this.fhs_status, this.fhandle3));
};



///--- Exports

module.exports = {
    MountMntReply: MountMntReply
};
