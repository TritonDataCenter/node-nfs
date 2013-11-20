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


var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var sattr3 = require('./sattr3');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function MkdirCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.where, 'opts.where');
    assert.optionalObject(opts.attributes, 'opts.attributes');

    NfsCall.call(this, opts, true);

    this.where = opts.where || {
        dir: '',
        name: ''
    };

    this.attributes = opts.attributes || {
        mode: null,
        uid: null,
        gid: null,
        size: null,
        how_a_time: 0,
        atime: null,
        how_m_time: 0,
        mtime: null
    };

    this._nfs_mkdir_call = true; // MDB
}
util.inherits(MkdirCall, NfsCall);
Object.defineProperty(MkdirCall.prototype, 'object', {
    get: function object() {
        return (this.where.dir);
    }
});


MkdirCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.where.dir = xdr.readString();
        this.where.name = xdr.readString();
        this.attributes = sattr3.parse(xdr);
    } else {
        this.push(chunk);
    }

    cb();
};


MkdirCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this.where.dir) + XDR.byteLength(this.where.name);

    len += sattr3.length(this.attributes);

    var xdr = this._serialize(len);

    xdr.writeString(this.where.dir);
    xdr.writeString(this.where.name);

    sattr3.serialize(xdr, this.attributes);

    this.write(xdr.buffer());
};


MkdirCall.prototype.toString = function toString() {
    var fmt = '[object MkdirCall <xid=%d, where=%j, attributes=%j>]';
    return (util.format(fmt, this.xid, this.where, this.attributes));
};



///--- Exports

module.exports = {
    MkdirCall: MkdirCall
};
