// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.14 Procedure 14: RENAME - Rename a File or Directory
//
//   SYNOPSIS
//
//      RENAME3res NFSPROC3_RENAME(RENAME3args) = 14;
//
//      struct RENAME3args {
//           diropargs3   from;
//           diropargs3   to;
//      };
//
//      struct RENAME3resok {
//           wcc_data     fromdir_wcc;
//           wcc_data     todir_wcc;
//      };
//
//      struct RENAME3resfail {
//           wcc_data     fromdir_wcc;
//           wcc_data     todir_wcc;
//      };
//
//      union RENAME3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           RENAME3resok   resok;
//      default:
//           RENAME3resfail resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure RENAME renames the file identified by from.name
//      in the directory, from.dir, to to.name in the di- rectory,
//      to.dir. The operation is required to be atomic to the
//      client. To.dir and from.dir must reside on the same file
//      system and server. On entry, the arguments in RENAME3args
//      are:
//
//      from
//         A diropargs3 structure identifying the source (the file
//         system object to be re-named):
//
//         from.dir
//            The file handle for the directory from which the
//            entry is to be renamed.
//
//         from.name
//            The name of the entry that identifies the object to
//            be renamed. Refer to General comments on filenames
//            on page 30.
//
//      to
//         A diropargs3 structure identifying the target (the new
//         name of the object):
//
//         to.dir
//            The file handle for the directory to which the
//            object is to be renamed.
//
//         to.name
//            The new name for the object. Refer to General
//            comments on filenames on page 30.
//
//      If the directory, to.dir, already contains an entry with
//      the name, to.name, the source object must be compatible
//      with the target: either both are non-directories or both
//      are directories and the target must be empty. If
//      compatible, the existing target is removed before the
//      rename occurs. If they are not compatible or if the target
//      is a directory but not empty, the server should return the
//      error, NFS3ERR_EXIST.
//
//      On successful return, RENAME3res.status is NFS3_OK and
//      RENAME3res.resok contains:
//
//      fromdir_wcc
//         Weak cache consistency data for the directory,
//         from.dir.
//
//      todir_wcc
//         Weak cache consistency data for the directory, to.dir.
//
//      Otherwise, RENAME3res.status contains the error on failure
//      and RENAME3res.resfail contains the following:
//
//      fromdir_wcc
//         Weak cache consistency data for the directory,
//         from.dir.
//
//      todir_wcc
//         Weak cache consistency data for the directory, to.dir.
//
//   IMPLEMENTATION
//      The RENAME operation must be atomic to the client. The
//      message "to.dir and from.dir must reside on the same file
//      system on the server, [or the operation will fail]" means
//      that the fsid fields in the attributes for the directories
//      are the same. If they reside on different file systems,
//      the error, NFS3ERR_XDEV, is returned. Even though the
//      operation is atomic, the status, NFS3ERR_MLINK, may be
//      returned if the server used a "unlink/link/unlink"
//      sequence internally.
//
//      A file handle may or may not become stale on a rename.
//      However, server implementors are strongly encouraged to
//      attempt to keep file handles from becoming stale in this
//      fashion.
//
//      On some servers, the filenames, "." and "..", are illegal
//      as either from.name or to.name. In addition, neither
//      from.name nor to.name can be an alias for from.dir. These
//      servers will return the error, NFS3ERR_INVAL, in these
//      cases.
//
//      If from and to both refer to the same file (they might
//      be hard links of each other), then RENAME should perform
//      no action and return NFS3_OK.
//
//      Refer to General comments on filenames on page 30.
//
//   ERRORS
//
//      NFS3ERR_NOENT
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_EXIST
//      NFS3ERR_XDEV
//      NFS3ERR_NOTDIR
//      NFS3ERR_ISDIR
//      NFS3ERR_INVAL
//      NFS3ERR_NOSPC
//      NFS3ERR_ROFS
//      NFS3ERR_MLINK
//      NFS3ERR_NAMETOOLONG
//      NFS3ERR_NOTEMPTY
//      NFS3ERR_DQUOT
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_NOTSUPP
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//   REMOVE and LINK.

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

function RenameReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.dir_wcc = opts.dir_wcc | null;

    this._nfs_rename_reply = true; // MDB
}
util.inherits(RenameReply, NfsReply);
RenameReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_NOENT,
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_ACCES,
    nfs_err.NFS3ERR_EXIST,
    nfs_err.NFS3ERR_XDEV,
    nfs_err.NFS3ERR_NOTDIR,
    nfs_err.NFS3ERR_ISDIR,
    nfs_err.NFS3ERR_INVAL,
    nfs_err.NFS3ERR_NOSPC,
    nfs_err.NFS3ERR_ROFS,
    nfs_err.NFS3ERR_MLINK,
    nfs_err.NFS3ERR_NAMETOOLONG,
    nfs_err.NFS3ERR_NOTEMPTY,
    nfs_err.NFS3ERR_DQUOT,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_NOTSUPP,
    nfs_err.NFS3ERR_SERVERFAULT
];


RenameReply.prototype.set_fromdir_wcc = function set_fromdir_wcc() {
    this.fromdir_wcc = wcc_data.create();
    return (this.fromdir_wcc);
};

RenameReply.prototype.set_todir_wcc = function set_todir_wcc() {
    this.todir_wcc = wcc_data.create();
    return (this.todir_wcc);
};


RenameReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        this.fromdir_wcc = wcc_data.parse(xdr);
        this.todir_wcc = wcc_data.parse(xdr);
    } else {
        this.push(chunk);
    }

    cb();
};


RenameReply.prototype.writeHead = function writeHead() {
    var len = 4;

    len += wcc_data.length(this.fromdir_wcc);
    len += wcc_data.length(this.todir_wcc);

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    wcc_data.serialize(xdr, this.fromdir_wcc);
    wcc_data.serialize(xdr, this.todir_wcc);

    this.write(xdr.buffer());
};


RenameReply.prototype.toString = function toString() {
    var fmt = '[object RenameReply <xid=%d, status=%d, fromdir_wcc=%j, ' +
        'todir_wcc=%j>]';
    return (util.format(fmt, this.xid, this.status, this.fromdir_wcc,
        this.todir_wcc));
};



///--- Exports

module.exports = {
    RenameReply: RenameReply
};
