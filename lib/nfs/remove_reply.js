// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.12 Procedure 12: REMOVE - Remove a File
//
//   SYNOPSIS
//
//      REMOVE3res NFSPROC3_REMOVE(REMOVE3args) = 12;
//
//      struct REMOVE3args {
//           diropargs3  object;
//      };
//
//      struct REMOVE3resok {
//           wcc_data    dir_wcc;
//      };
//
//      struct REMOVE3resfail {
//           wcc_data    dir_wcc;
//      };
//
//      union REMOVE3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           REMOVE3resok   resok;
//      default:
//           REMOVE3resfail resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure REMOVE removes (deletes) an entry from a
//      directory. If the entry in the directory was the last
//      reference to the corresponding file system object, the
//      object may be destroyed.  On entry, the arguments in
//      REMOVE3args are:
//
//      object
//         A diropargs3 structure identifying the entry to be
//         removed:
//
//      dir
//         The file handle for the directory from which the entry
//         is to be removed.
//
//      name
//         The name of the entry to be removed. Refer to General
//         comments on filenames on page 30.
//
//      On successful return, REMOVE3res.status is NFS3_OK and
//      REMOVE3res.resok contains:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         object.dir.  For a client that requires only the
//         post-REMOVE directory attributes, these can be found in
//         dir_wcc.after.
//
//      Otherwise, REMOVE3res.status contains the error on failure
//      and REMOVE3res.resfail contains the following:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         object.dir.  For a client that requires only the
//         post-REMOVE directory attributes, these can be found in
//         dir_wcc.after. Even though the REMOVE failed, full
//         wcc_data is returned to allow the client to determine
//         whether the failing REMOVE changed the directory.
//
//   IMPLEMENTATION
//
//      In general, REMOVE is intended to remove non-directory
//      file objects and RMDIR is to be used to remove
//      directories.  However, REMOVE can be used to remove
//      directories, subject to restrictions imposed by either the
//      client or server interfaces.  This had been a source of
//      confusion in the NFS version 2 protocol.
//
//      The concept of last reference is server specific. However,
//      if the nlink field in the previous attributes of the
//      object had the value 1, the client should not rely on
//      referring to the object via a file handle. Likewise, the
//      client should not rely on the resources (disk space,
//      directory entry, and so on.) formerly associated with the
//      object becoming immediately available. Thus, if a client
//      needs to be able to continue to access a file after using
//      REMOVE to remove it, the client should take steps to make
//      sure that the file will still be accessible. The usual
//      mechanism used is to use RENAME to rename the file from
//      its old name to a new hidden name.
//
//      Refer to General comments on filenames on page 30.
//
//   ERRORS
//
//      NFS3ERR_NOENT
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_NOTDIR
//      NFS3ERR_NAMETOOLONG
//      NFS3ERR_ROFS
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      RMDIR and RENAME.

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

function RemoveReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.dir_wcc = opts.dir_wcc | null;

    this._nfs_remove_reply = true; // MDB
}
util.inherits(RemoveReply, NfsReply);
RemoveReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_NOENT,
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_ACCES,
    nfs_err.NFS3ERR_NOTDIR,
    nfs_err.NFS3ERR_NAMETOOLONG,
    nfs_err.NFS3ERR_ROFS,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


RemoveReply.prototype.set_dir_wcc = function set_dir_wcc() {
    this.dir_wcc = wcc_data.create();
    return (this.dir_wcc);
};


RemoveReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        this.dir_wcc = wcc_data.parse(xdr);
    } else {
        this.push(chunk);
    }

    cb();
};


RemoveReply.prototype.writeHead = function writeHead() {
    var len = 4;

    len += wcc_data.length(this.dir_wcc);

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    wcc_data.serialize(xdr, this.dir_wcc);

    this.write(xdr.buffer());
};


RemoveReply.prototype.toString = function toString() {
    var fmt = '[object RemoveReply <xid=%d, status=%d, dir_wcc=%j>]';
    return (util.format(fmt, this.xid, this.status, this.dir_wcc));
};



///--- Exports

module.exports = {
    RemoveReply: RemoveReply
};
