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

function calculate_buffer_length(exports) {
    assert.arrayOfObject(exports, 'exports');
    var sz = 0;
    exports.forEach(function (e) {
        sz += 4; // boolean marker
        sz += XDR.byteLength(e.dirpath);
        e.groups.forEach(function (g) {
            sz += 4; // Optional-Data boolean marker
            sz += XDR.byteLength(g.name);
        });
        sz += 4; // final boolean marker
    });
    sz += 4; // final boolean marker

    return (sz);
}



///--- API

function MountExportReply(opts) {
    RpcReply.call(this, opts);

    this.exports = [];

    this._nfs_mount_export_reply = true; // MDB
}
util.inherits(MountExportReply, RpcReply);


MountExportReply.prototype.addExport = function addExport(opts, noClone) {
    assert.object(opts);
    assert.string(opts.dirpath, 'options.dirpath');
    assert.arrayOfObject(opts.groups, 'options.groups');
    opts.groups.forEach(function (group) {
        assert.string(group.name, 'group.name');
    });

    assert.optionalBool(noClone, 'noClone');

    this.exports.push(noClone ? opts : clone(opts));
};


MountExportReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        while (xdr.readBool()) {
            var dirpath = xdr.readString();
            var groups = [];
            while (xdr.readBool()) {
                var name = xdr.readString();
                groups.push(name);
            }
            this.addExport({
                dirpath: dirpath,
                groupts: groups
            }, true);
        }
    } else {
        this.push(chunk);
    }

    cb();
};


MountExportReply.prototype.writeHead = function writeHead() {
    var len = calculate_buffer_length(this.exports);
    var xdr = this._serialize(len);

    this.exports.forEach(function (e) {
        xdr.writeBool(true);
        xdr.writeString(e.dirpath);
        e.groups.forEach(function (g) {
            xdr.writeBool(true);
            xdr.writeString(g.name);
        });
        xdr.writeBool(false);
    });
    xdr.writeBool(false);

    this.write(xdr.buffer());
};


MountExportReply.prototype.toString = function toString() {
    var fmt = '[object MountExportReply <xid=%d, exports=%j>]';
    return (util.format(fmt, this.xid, this.exports));
};



///--- Exports

module.exports = {
    MountExportReply: MountExportReply
};
