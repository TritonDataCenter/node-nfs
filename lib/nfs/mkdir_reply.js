// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.9 Procedure 9: MKDIR - Create a directory
//
//   SYNOPSIS
//
//       MKDIR3res NFSPROC3_MKDIR(MKDIR3args) = 9;
//
//       struct MKDIR3args {
//            diropargs3   where;
//            sattr3       attributes;
//       };
//
//       struct MKDIR3resok {
//            post_op_fh3   obj;
//            post_op_attr  obj_attributes;
//            wcc_data      dir_wcc;
//       };
//
//       struct MKDIR3resfail {
//            wcc_data      dir_wcc;
//       };
//
//       union MKDIR3res switch (nfsstat3 status) {
//       case NFS3_OK:
//            MKDIR3resok   resok;
//       default:
//            MKDIR3resfail resfail;
//       };
//
//   DESCRIPTION
//
//      Procedure MKDIR creates a new subdirectory. On entry, the
//      arguments in MKDIR3args are:
//
//      where
//         The location of the subdirectory to be created:
//
//         dir
//            The file handle for the directory in which the
//            subdirectory is to be created.
//
//         name
//            The name that is to be associated with the created
//            subdirectory. Refer to General comments on filenames
//            on page 30.
//
//      attributes
//         The initial attributes for the subdirectory.
//
//      On successful return, MKDIR3res.status is NFS3_OK and the
//      results in MKDIR3res.resok are:
//
//      obj
//         The file handle for the newly created directory.
//
//      obj_attributes
//         The attributes for the newly created subdirectory.
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires only the
//         post-MKDIR directory attributes, these can be found in
//         dir_wcc.after.
//
//      Otherwise, MKDIR3res.status contains the error on failure
//      and MKDIR3res.resfail contains the following:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires only the
//         post-MKDIR directory attributes, these can be found in
//         dir_wcc.after. Even though the MKDIR failed, full
//         wcc_data is returned to allow the client to determine
//         whether the failing MKDIR resulted in any change to the
//         directory.
//
//   IMPLEMENTATION
//
//      Many server implementations will not allow the filenames,
//      "." or "..", to be used as targets in a MKDIR operation.
//      In this case, the server should return NFS3ERR_EXIST.
//      Refer to General comments on filenames on page 30.
//
//   ERRORS
//
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_EXIST
//      NFS3ERR_NOTDIR
//      NFS3ERR_NOSPC
//      NFS3ERR_ROFS
//      NFS3ERR_NAMETOOLONG
//      NFS3ERR_DQUOT
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_NOTSUPP
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      CREATE, SYMLINK, MKNOD, and PATHCONF.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var nfs_err = require('./errors');
var fattr3 = require('./fattr3');
var wcc_data = require('./wcc_data');
var NfsReply = require('./nfs_reply').NfsReply;



///--- Globals

var XDR = rpc.XDR;



///--- API

function MkdirReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.obj = '';
    this.obj_attributes = opts.obj_attributes | null;
    this.dir_wcc = opts.dir_wcc | null;

    this._nfs_mkdir_reply = true; // MDB
}
util.inherits(MkdirReply, NfsReply);
MkdirReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_ACCES,
    nfs_err.NFS3ERR_EXIST,
    nfs_err.NFS3ERR_NOTDIR,
    nfs_err.NFS3ERR_NOSPC,
    nfs_err.NFS3ERR_ROFS,
    nfs_err.NFS3ERR_NAMETOOLONG,
    nfs_err.NFS3ERR_DQUOT,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_NOTSUPP,
    nfs_err.NFS3ERR_SERVERFAULT
];


MkdirReply.prototype.setObjAttributes = function setObjAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.obj_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};


MkdirReply.prototype.set_dir_wcc = function set_dir_wcc() {
    this.dir_wcc = wcc_data.create();
    return (this.dir_wcc);
};


MkdirReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        if (this.status === 0) {
            if (xdr.readBool())
                this.obj = xdr.readString();
            if (xdr.readBool())
                this.obj_attributes = fattr3.parse(xdr);
        }

        this.dir_wcc = wcc_data.parse(xdr);
    } else {
        this.push(chunk);
    }

    cb();
};


MkdirReply.prototype.writeHead = function writeHead() {
    var len = 4;

    if (this.status === 0) {
        len += 4 + XDR.byteLength(this.obj);

        len += 4;
        if (this.obj_attributes)
            len += fattr3.XDR_SIZE;
    }

    len += wcc_data.length(this.dir_wcc);

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    if (this.status === 0) {
        xdr.writeBool(true);
        xdr.writeString(this.obj);
        if (this.obj_attributes) {
            xdr.writeBool(true);
            fattr3.serialize(xdr, this.obj_attributes);
        } else {
            xdr.writeBool(false);
        }
    }

    wcc_data.serialize(xdr, this.dir_wcc);

    this.write(xdr.buffer());
};


MkdirReply.prototype.toString = function toString() {
    var fmt = '[object MkdirReply <xid=%d, status=%d, obj=%j, ' +
        'obj_attributes=%j, dir_wcc=%j>]';
    return (util.format(fmt, this.xid, this.status, this.obj,
        this.obj_attributes, this.dir_wcc));
};



///--- Exports

module.exports = {
    MkdirReply: MkdirReply
};
