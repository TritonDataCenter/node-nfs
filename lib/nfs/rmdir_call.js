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


var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function RmdirCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.object, 'opts.object');

    NfsCall.call(this, opts, true);

    this._object = opts.object || {
        dir: '',
        name: ''
    };

    this._nfs_rmdir_call = true; // MDB
}
util.inherits(RmdirCall, NfsCall);
Object.defineProperty(RmdirCall.prototype, 'object', {
    get: function object() {
        return (this._object.dir);
    }
});


RmdirCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this._object.dir = xdr.readString();
        this._object.name = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
};


RmdirCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this._object.dir) +
        XDR.byteLength(this._object.name);

    var xdr = this._serialize(len);

    xdr.writeString(this._object.dir);
    xdr.writeString(this._object.name);

    this.write(xdr.buffer());
};


RmdirCall.prototype.toString = function toString() {
    var fmt = '[object RmdirCall <xid=%d, object=%j>]';
    return (util.format(fmt, this.xid, this._object));
};



///--- Exports

module.exports = {
    RmdirCall: RmdirCall
};
