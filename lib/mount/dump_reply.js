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

function MountDumpReply(opts) {
    RpcReply.call(this, opts);

    this.mappings = [];

    this._nfs_mount_dump_reply = true; // MDB
}
util.inherits(MountDumpReply, RpcReply);


MountDumpReply.prototype.addMapping = function addMapping(opts, noClone) {
    assert.object(opts);
    assert.string(opts.name, 'options.name');
    assert.string(opts.dirpath, 'options.dirpath');
    assert.optionalBool(noClone, 'noClone');

    this.mappings.push(noClone ? opts : clone(opts));
};


MountDumpReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        while (xdr.readBool()) {
            this.addMapping({
                name: xdr.readString(),
                dirpath: xdr.readString()
            }, true);
        }
    } else {
        this.push(chunk);
    }

    cb();
};


MountDumpReply.prototype.writeHead = function writeHead() {
    var len = calculate_buffer_length(this.mappings);
    var xdr = this._serialize(len);

    this.mappings.forEach(function (p) {
        xdr.writeBool(true);
        xdr.writeString(p.name);
        xdr.writeString(p.dirpath);
    });
    xdr.writeBool(false);

    this.write(xdr.buffer());
};


MountDumpReply.prototype.toString = function toString() {
    var fmt = '[object MountDumpReply <xid=%d, mappings=%j>]';
    return (util.format(fmt, this.xid, this.mappings));
};



///--- Exports

module.exports = {
    MountDumpReply: MountDumpReply
};
