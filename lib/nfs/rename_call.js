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


var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function RenameCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.from, 'opts.from');
    assert.optionalObject(opts.to, 'opts.to');

    NfsCall.call(this, opts, true);

    this.from = opts.from || {
        dir: '',
        name: ''
    };

    this.to = opts.to || {
        dir: '',
        name: ''
    };

    this._nfs_rename_call = true; // MDB
}
util.inherits(RenameCall, NfsCall);
Object.defineProperty(RenameCall.prototype, 'object', {
    get: function object() {
        return (this.from.dir);
    }
});


RenameCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.from.dir = xdr.readString();
        this.from.name = xdr.readString();
        this.to.dir = xdr.readString();
        this.to.name = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
};


RenameCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this.from.dir) +
        XDR.byteLength(this.from.name) +
        XDR.byteLength(this.to.dir) +
        XDR.byteLength(this.to.name);

    var xdr = this._serialize(len);

    xdr.writeString(this.from.dir);
    xdr.writeString(this.from.name);
    xdr.writeString(this.to.dir);
    xdr.writeString(this.to.name);

    this.write(xdr.buffer());
};


RenameCall.prototype.toString = function toString() {
    var fmt = '[object RenameCall <xid=%d, from=%j, to=%j>]';
    return (util.format(fmt, this.xid, this.from, this.to));
};



///--- Exports

module.exports = {
    RenameCall: RenameCall
};
