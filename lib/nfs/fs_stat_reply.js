// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.18 Procedure 18: FSSTAT - Get dynamic file system information
//
//    SYNOPSIS
//
//       FSSTAT3res NFSPROC3_FSSTAT(FSSTAT3args) = 18;
//
//       struct FSSTAT3args {
//            nfs_fh3   fsroot;
//       };
//
//       struct FSSTAT3resok {
//            post_op_attr obj_attributes;
//            size3        tbytes;
//            size3        fbytes;
//            size3        abytes;
//            size3        tfiles;
//            size3        ffiles;
//            size3        afiles;
//            uint32       invarsec;
//       };
//
//       struct FSSTAT3resfail {
//            post_op_attr obj_attributes;
//       };
//
//       union FSSTAT3res switch (nfsstat3 status) {
//       case NFS3_OK:
//            FSSTAT3resok   resok;
//       default:
//            FSSTAT3resfail resfail;
//       };
//
//    DESCRIPTION
//
//       Procedure FSSTAT retrieves volatile file system state
//       information. On entry, the arguments in FSSTAT3args are:
//
//       fsroot
//          A file handle identifying a object in the file system.
//          This is normally a file handle for a mount point for a
//          file system, as originally obtained from the MOUNT
//          service on the server.
//
//       On successful return, FSSTAT3res.status is NFS3_OK and
//       FSSTAT3res.resok contains:
//
//       obj_attributes
//          The attributes of the file system object specified in
//          fsroot.
//
//       tbytes
//          The total size, in bytes, of the file system.
//
//       fbytes
//          The amount of free space, in bytes, in the file
//          system.
//
//       abytes
//          The amount of free space, in bytes, available to the
//          user identified by the authentication information in
//          the RPC.  (This reflects space that is reserved by the
//          file system; it does not reflect any quota system
//          implemented by the server.)
//
//       tfiles
//          The total number of file slots in the file system. (On
//          a UNIX server, this often corresponds to the number of
//          inodes configured.)
//
//       ffiles
//          The number of free file slots in the file system.
//
//       afiles
//          The number of free file slots that are available to the
//          user corresponding to the authentication information in
//          the RPC.  (This reflects slots that are reserved by the
//          file system; it does not reflect any quota system
//          implemented by the server.)
//
//       invarsec
//          A measure of file system volatility: this is the number
//          of seconds for which the file system is not expected to
//          change. For a volatile, frequently updated file system,
//          this will be 0. For an immutable file system, such as a
//          CD-ROM, this would be the largest unsigned integer. For
//          file systems that are infrequently modified, for
//          example, one containing local executable programs and
//          on-line documentation, a value corresponding to a few
//          hours or days might be used. The client may use this as
//          a hint in tuning its cache management. Note however,
//          this measure is assumed to be dynamic and may change at
//          any time.
//
//       Otherwise, FSSTAT3res.status contains the error on failure
//       and FSSTAT3res.resfail contains the following:
//
//       obj_attributes
//          The attributes of the file system object specified in
//          fsroot.
//
//    IMPLEMENTATION
//
//       Not all implementations can support the entire list of
//       attributes. It is expected that servers will make a best
//       effort at supporting all the attributes.
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
//       FSINFO.

var fs = require('fs');
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

function FsStatReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.obj_attributes = null;
    this.tbytes = 0;
    this.fbytes = 0;
    this.abytes = 0;
    this.tfiles = 0;
    this.ffiles = 0;
    this.afiles = 0;
    this.invarsec = 0;

    this._nfs_fs_stat_reply = true; // MDB
}
util.inherits(FsStatReply, NfsReply);
FsStatReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


FsStatReply.prototype.setAttributes = function setAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.obj_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};


FsStatReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        if (this.status === 0) {
            if (xdr.readBool())
                this.obj_attributes = fattr3.parse(xdr);
            this.tbytes = xdr.readHyper();
            this.fbytes = xdr.readHyper();
            this.abytes = xdr.readHyper();
            this.tfiles = xdr.readHyper();
            this.ffiles = xdr.readHyper();
            this.afiles = xdr.readHyper();
            this.invarsec = xdr.readInt();
        }
    } else {
        this.push(chunk);
    }

    cb();
};


FsStatReply.prototype.writeHead = function writeHead() {
    var len = 8;
    if (this.status === 0)
        len += fattr3.XDR_SIZE + 52;

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    if (this.obj_attributes) {
        xdr.writeBool(true);
        fattr3.serialize(xdr, this.obj_attributes);
    } else {
        xdr.writeBool(false);
    }

    if (this.status === 0) {
        xdr.writeHyper(this.tbytes);
        xdr.writeHyper(this.fbytes);
        xdr.writeHyper(this.abytes);
        xdr.writeHyper(this.tfiles);
        xdr.writeHyper(this.ffiles);
        xdr.writeHyper(this.afiles);
        xdr.writeInt(this.invarsec);
    }

    this.write(xdr.buffer());
};


FsStatReply.prototype.toString = function toString() {
    var fmt = '[object FsStatReply <xid=%d, status=%d, attributes=%j, ' +
        'tbytes=%d, fbytes=%d, abytes=%d, tfiles=%d, ffiles=%d, afiles=%d, ' +
        'invarsec=%d>]';
    return (util.format(fmt,
                        this.xid,
                        this.status,
                        this.obj_attributes,
                        this.tbytes,
                        this.fbytes,
                        this.abytes,
                        this.tfiles,
                        this.ffiles,
                        this.afiles,
                        this.invarsec));
};



///--- Exports

module.exports = {
    FsStatReply: FsStatReply
};
