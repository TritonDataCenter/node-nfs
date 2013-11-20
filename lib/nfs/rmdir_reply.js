// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.13 Procedure 13: RMDIR - Remove a Directory
//
//   SYNOPSIS
//
//      RMDIR3res NFSPROC3_RMDIR(RMDIR3args) = 13;
//
//      struct RMDIR3args {
//           diropargs3  object;
//      };
//
//      struct RMDIR3resok {
//           wcc_data    dir_wcc;
//      };
//
//      struct RMDIR3resfail {
//           wcc_data    dir_wcc;
//      };
//
//      union RMDIR3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           RMDIR3resok   resok;
//      default:
//           RMDIR3resfail resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure RMDIR removes (deletes) a subdirectory from a
//      directory. If the directory entry of the subdirectory is
//      the last reference to the subdirectory, the subdirectory
//      may be destroyed. On entry, the arguments in RMDIR3args
//      are:
//
//      object
//         A diropargs3 structure identifying the directory entry
//         to be removed:
//
//         dir
//            The file handle for the directory from which the
//            subdirectory is to be removed.
//
//         name
//            The name of the subdirectory to be removed. Refer to
//            General comments on filenames on page 30.
//
//      On successful return, RMDIR3res.status is NFS3_OK and
//      RMDIR3res.resok contains:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         object.dir.  For a client that requires only the
//         post-RMDIR directory attributes, these can be found in
//         dir_wcc.after.
//
//      Otherwise, RMDIR3res.status contains the error on failure
//      and RMDIR3res.resfail contains the following:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         object.dir.  For a client that requires only the
//         post-RMDIR directory attributes, these can be found in
//         dir_wcc.after. Note that even though the RMDIR failed,
//         full wcc_data is returned to allow the client to
//         determine whether the failing RMDIR changed the
//         directory.
//
//   IMPLEMENTATION
//
//      Note that on some servers, removal of a non-empty
//      directory is disallowed.
//
//      On some servers, the filename, ".", is illegal. These
//      servers will return the error, NFS3ERR_INVAL. On some
//      servers, the filename, "..", is illegal. These servers
//      will return the error, NFS3ERR_EXIST. This would seem
//      inconsistent, but allows these servers to comply with
//      their own specific interface definitions.  Clients should
//      be prepared to handle both cases.
//
//      The client should not rely on the resources (disk space,
//      directory entry, and so on.) formerly associated with the
//      directory becoming immediately available.
//
//   ERRORS
//
//      NFS3ERR_NOENT
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_INVAL
//      NFS3ERR_EXIST
//      NFS3ERR_NOTDIR
//      NFS3ERR_NAMETOOLONG
//      NFS3ERR_ROFS
//      NFS3ERR_NOTEMPTY
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_NOTSUPP
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      REMOVE.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var nfs_err = require('./errors');
var wcc_data = require('./wcc_data');
var NfsReply = require('./nfs_reply').NfsReply;



///--- Globals

var XDR = rpc.XDR;



///--- API

function RmdirReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.dir_wcc = opts.dir_wcc | null;

    this._nfs_rmdir_reply = true; // MDB
}
util.inherits(RmdirReply, NfsReply);
RmdirReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_NOENT,
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_ACCES,
    nfs_err.NFS3ERR_INVAL,
    nfs_err.NFS3ERR_EXIST,
    nfs_err.NFS3ERR_NOTDIR,
    nfs_err.NFS3ERR_ROFS,
    nfs_err.NFS3ERR_NAMETOOLONG,
    nfs_err.NFS3ERR_NOTEMPTY,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_NOTSUPP,
    nfs_err.NFS3ERR_SERVERFAULT
];


RmdirReply.prototype.set_dir_wcc = function set_dir_wcc() {
    this.dir_wcc = wcc_data.create();
    return (this.dir_wcc);
};


RmdirReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        this.dir_wcc = wcc_data.parse(xdr);
    } else {
        this.push(chunk);
    }

    cb();
};


RmdirReply.prototype.writeHead = function writeHead() {
    var len = 4;

    len += wcc_data.length(this.dir_wcc);

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    wcc_data.serialize(xdr, this.dir_wcc);

    this.write(xdr.buffer());
};


RmdirReply.prototype.toString = function toString() {
    var fmt = '[object RmdirReply <xid=%d, status=%d, dir_wcc=%j>]';
    return (util.format(fmt, this.xid, this.status, this.dir_wcc));
};



///--- Exports

module.exports = {
    RmdirReply: RmdirReply
};
