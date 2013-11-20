// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.10 Procedure 10: SYMLINK - Create a symbolic link
//
//   SYNOPSIS
//
//      SYMLINK3res NFSPROC3_SYMLINK(SYMLINK3args) = 10;
//
//      struct symlinkdata3 {
//           sattr3    symlink_attributes;
//           nfspath3  symlink_data;
//      };
//
//      struct SYMLINK3args {
//           diropargs3    where;
//           symlinkdata3  symlink;
//      };
//
//      struct SYMLINK3resok {
//           post_op_fh3   obj;
//           post_op_attr  obj_attributes;
//           wcc_data      dir_wcc;
//      };
//
//      struct SYMLINK3resfail {
//           wcc_data      dir_wcc;
//      };
//
//      union SYMLINK3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           SYMLINK3resok   resok;
//      default:
//           SYMLINK3resfail resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure SYMLINK creates a new symbolic link. On entry,
//      the arguments in SYMLINK3args are:
//
//      where
//         The location of the symbolic link to be created:
//
//         dir
//            The file handle for the directory in which the
//            symbolic link is to be created.
//
//         name
//            The name that is to be associated with the created
//            symbolic link. Refer to General comments on
//            filenames on page 30.
//
//      symlink
//         The symbolic link to create:
//
//         symlink_attributes
//            The initial attributes for the symbolic link.
//
//         symlink_data
//            The string containing the symbolic link data.
//
//      On successful return, SYMLINK3res.status is NFS3_OK and
//      SYMLINK3res.resok contains:
//
//      obj
//         The file handle for the newly created symbolic link.
//
//      obj_attributes
//         The attributes for the newly created symbolic link.
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires only the
//         post-SYMLINK directory attributes, these can be found
//         in dir_wcc.after.
//
//      Otherwise, SYMLINK3res.status contains the error on
//      failure and SYMLINK3res.resfail contains the following:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires only the
//         post-SYMLINK directory attributes, these can be found
//         in dir_wcc.after. Even though the SYMLINK failed, full
//         wcc_data is returned to allow the client to determine
//         whether the failing SYMLINK changed the directory.
//
//   IMPLEMENTATION
//
//      Refer to General comments on filenames on page 30.
//
//      For symbolic links, the actual file system node and its
//      contents are expected to be created in a single atomic
//      operation.  That is, once the symbolic link is visible,
//      there must not be a window where a READLINK would fail or
//      return incorrect data.
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
//      READLINK, CREATE, MKDIR, MKNOD, FSINFO, and PATHCONF.

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

function SymlinkReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.wcc_data = opts.wcc_data | {};

    this._nfs_symlink_reply = true; // MDB
}
util.inherits(SymlinkReply, NfsReply);
SymlinkReply.prototype._allowed_error_codes = [
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


SymlinkReply.prototype.setObjAttributes = function setObjAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.obj_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};


SymlinkReply.prototype.set_dir_wcc = function set_dir_wcc() {
    this.dir_wcc = wcc_data.create();
    return (this.dir_wcc);
};


SymlinkReply.prototype._transform = function _transform(chunk, enc, cb) {
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


SymlinkReply.prototype.writeHead = function writeHead() {
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


SymlinkReply.prototype.toString = function toString() {
    var fmt = '[object SymlinkReply <xid=%d, status=%d, obj=%j, ' +
        'obj_attributes=%j, dir_wcc=%j>]';
    return (util.format(fmt, this.xid, this.status, this.obj,
        this.obj_attributes, this.dir_wcc));
};



///--- Exports

module.exports = {
    SymlinkReply: SymlinkReply
};
