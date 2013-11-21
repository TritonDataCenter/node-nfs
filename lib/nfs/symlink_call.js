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

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var sattr3 = require('./sattr3');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function SymlinkCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.where, 'opts.where');
    assert.optionalObject(opts.symlink_attributes, 'opts.symlink_attributes');
    assert.optionalString(opts.symlink_data, 'opts.symlink_data');

    NfsCall.call(this, opts, true);

    this.where = opts.where || {
        dir: '',
        name: ''
    };
    this.symlink_attributes = opts.symlink_attributes || {
        mode: null,
        uid: null,
        gid: null,
        size: null,
        how_a_time: 0,
        atime: null,
        how_m_time: 0,
        mtime: null
    };
    this.symlink_data = opts.symlink_data || '';

    this._nfs_symlink_call = true; // MDB
}
util.inherits(SymlinkCall, NfsCall);
Object.defineProperty(SymlinkCall.prototype, 'object', {
    get: function object() {
        return (this.where.dir);
    }
});


SymlinkCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.where.dir = xdr.readString();
        this.where.name = xdr.readString();
        this.symlink_attributes = sattr3.parse(xdr);
        this.symlink_data = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
};


SymlinkCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this.where.dir) + XDR.byteLength(this.where.name);

    len += sattr3.length(this.symlink_attributes);
    len += XDR.byteLength(this.symlink_data);

    var xdr = this._serialize(len);

    xdr.writeString(this.where.dir);
    xdr.writeString(this.where.name);
    sattr3.serialize(xdr, this.symlink_attributes);
    xdr.writeString(this.symlink_data);

    this.write(xdr.buffer());
};


SymlinkCall.prototype.toString = function toString() {
    var fmt = '[object SymlinkCall <xid=%d, where=%j, ' +
        'symlink_attributes=%j, symlink_data=%s>]';
    return (util.format(fmt, this.xid,
        this.where, this.symlink_attributes, this.symlink_data));
};



///--- Exports

module.exports = {
    SymlinkCall: SymlinkCall
};
