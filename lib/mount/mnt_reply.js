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

var mnt_err = require('./errors');
var MountReply = require('./mount_reply').MountReply;


///--- Globals

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
    MountReply.call(this, opts);

    this.fhs_status = 0;
    this.mountinfo = {
        fhandle: '',
        auth_flavors: [1]
    };

    this._nfs_mount_mnt_reply = true; // MDB
}
util.inherits(MountMntReply, MountReply);
MountMntReply.prototype.__defineSetter__('status', function (s) {
    assert.number(s, 'status');
    this.fhs_status = s;
});
MountMntReply.prototype.__defineGetter__('status', function () {
    return (this.fhs_status);
});
MountMntReply.prototype._allowed_error_codes = [
    mnt_err.MNT3ERR_NOENT,
    mnt_err.MNT3ERR_IO,
    mnt_err.MNT3ERR_ACCES,
    mnt_err.MNT3ERR_NOTDIR,
    mnt_err.MNT3ERR_NAMETOOLONG
];


MountMntReply.prototype.setFileHandle = function setFileHandle(fh) {
    assert.string(fh, 'file_handle');

    this.mountinfo.fhandle = fh;

    if (this.mountinfo.fhandle.length > 64)
        this.mountinfo.fhandle.length = 64;

    return (this.mountinfo.fhandle);
};


MountMntReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.fhs_status = xdr.readInt();
        if (this.fhs_status === 0) {
            this.mountinfo.fhandle = xdr.readString();
            this.mountinfo.auth_flavors = xdr.readIntArray();
        }
    } else {
        this.push(chunk);
    }

    cb();
};


MountMntReply.prototype.writeHead = function writeHead() {
    var len = 4;
    if (this.fhs_status === 0) {
        len += XDR.byteLength(this.mountinfo.fhandle);
        len += XDR.byteLength(this.mountinfo.auth_flavors);
    }
    var xdr = this._serialize(len);

    xdr.writeInt(this.fhs_status);
    if (this.fhs_status === 0) {
        xdr.writeString(this.mountinfo.fhandle);
        xdr.writeIntArray(this.mountinfo.auth_flavors);
    }

    this.write(xdr.buffer());
};


MountMntReply.prototype.toString = function toString() {
    var fmt = '[object MountMntReply <xid=%d, status=%d, mountinfo=%j>]';
    return (util.format(fmt, this.xid, this.fhs_status, this.mountinfo));
};



///--- Exports

module.exports = {
    MountMntReply: MountMntReply
};
