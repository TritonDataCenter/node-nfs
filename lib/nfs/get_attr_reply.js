// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.1 Procedure 1: GETATTR - Get file attributes
//
//    SYNOPSIS
//
//       GETATTR3res NFSPROC3_GETATTR(GETATTR3args) = 1;
//
//       struct GETATTR3args {
//                    nfs_fh3  object;
//       };
//
//       struct GETATTR3resok {
//          fattr3   obj_attributes;
//       };
//
//       union GETATTR3res switch (nfsstat3 status) {
//       case NFS3_OK:
//          GETATTR3resok  resok;
//       default:
//          void;
//       };
//
//    DESCRIPTION
//
//       Procedure GETATTR retrieves the attributes for a specified
//       file system object. The object is identified by the file
//       handle that the server returned as part of the response
//       from a LOOKUP, CREATE, MKDIR, SYMLINK, MKNOD, or
//       READDIRPLUS procedure (or from the MOUNT service,
//       described elsewhere). On entry, the arguments in
//       GETATTR3args are:
//
//       object
//          The file handle of an object whose attributes are to be
//          retrieved.
//
//       On successful return, GETATTR3res.status is NFS3_OK and
//       GETATTR3res.resok contains:
//
//       obj_attributes
//          The attributes for the object.
//
//       Otherwise, GETATTR3res.status contains the error on failure and
//       no other results are returned.
//
//    IMPLEMENTATION
//
//       The attributes of file system objects is a point of major
//       disagreement between different operating systems. Servers
//       should make a best attempt to support all of the
//       attributes in the fattr3 structure so that clients can
//       count on this as a common ground. Some mapping may be
//       required to map local attributes to those in the fattr3
//       structure.
//
//       Today, most client NFS version 3 protocol implementations
//       implement a time-bounded attribute caching scheme to
//       reduce over-the-wire attribute checks.
//
//    ERRORS
//
//       NFS3ERR_IO
//       NFS3ERR_STALE
//       NFS3ERR_BADHANDLE
//       NFS3ERR_SERVERFAULT
//
//    SEE ALSO
//
//       ACCESS.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var nfs_err = require('./errors');
var fattr3 = require('./fattr3');
var NfsReply = require('./nfs_reply').NfsReply;



///--- Globals

var XDR = rpc.XDR;



///--- API

function GetAttrReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.obj_attributes = opts.obj_attributes | {};

    this._nfs_get_attr_reply = true; // MDB
}
util.inherits(GetAttrReply, NfsReply);
GetAttrReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


GetAttrReply.prototype.setAttributes = function setAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.obj_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};


GetAttrReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        if (this.status === 0)
            this.obj_attributes = fattr3.parse(xdr);
    } else {
        this.push(chunk);
    }

    cb();
};


GetAttrReply.prototype.writeHead = function writeHead() {
    var len = 4;
    if (this.status === 0)
        len += fattr3.XDR_SIZE;

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);
    if (this.status === 0)
        fattr3.serialize(xdr, this.obj_attributes);

    this.write(xdr.buffer());
};


GetAttrReply.prototype.toString = function toString() {
    var fmt = '[object GetAttrReply <xid=%d, status=%d, attributes=%j>]';
    return (util.format(fmt, this.xid, this.status, this.obj_attributes));
};



///--- Exports

module.exports = {
    GetAttrReply: GetAttrReply
};
