// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.2 Procedure 2: SETATTR - Set file attributes
//
//    SYNOPSIS
//
//       SETATTR3res NFSPROC3_SETATTR(SETATTR3args) = 2;
//
//       union sattrguard3 switch (bool check) {
//       case TRUE:
//          nfstime3  obj_ctime;
//       case FALSE:
//          void;
//       };
//
//       struct SETATTR3args {
//          nfs_fh3      object;
//          sattr3       new_attributes;
//          sattrguard3  guard;
//       };
//
//       struct SETATTR3resok {
//          wcc_data  obj_wcc;
//       };
//
//       struct SETATTR3resfail {
//          wcc_data  obj_wcc;
//       };
//
//       union SETATTR3res switch (nfsstat3 status) {
//       case NFS3_OK:
//          SETATTR3resok   resok;
//       default:
//          SETATTR3resfail resfail;
//       };
//
//    DESCRIPTION
//
//       Procedure SETATTR changes one or more of the attributes of
//       a file system object on the server. The new attributes are
//       specified by a sattr3 structure. On entry, the arguments
//       in SETATTR3args are:
//
//       object
//          The file handle for the object.
//
//       new_attributes
//          A sattr3 structure containing booleans and
//          enumerations describing the attributes to be set and the new
//          values for those attributes.
//
//       guard
//          A sattrguard3 union:
//
//          check
//             TRUE if the server is to verify that guard.obj_ctime
//             matches the ctime for the object; FALSE otherwise.
//
//       A client may request that the server check that the object
//       is in an expected state before performing the SETATTR
//       operation. To do this, it sets the argument guard.check to
//       TRUE and the client passes a time value in guard.obj_ctime.
//       If guard.check is TRUE, the server must compare the value of
//       guard.obj_ctime to the current ctime of the object. If the
//       values are different, the server must preserve the object
//       attributes and must return a status of NFS3ERR_NOT_SYNC.
//       If guard.check is FALSE, the server will not perform this
//       check.
//
//       On successful return, SETATTR3res.status is NFS3_OK and
//       SETATTR3res.resok contains:
//
//          obj_wcc
//             A wcc_data structure containing the old and new
//             attributes for the object.
//
//       Otherwise, SETATTR3res.status contains the error on
//       failure and SETATTR3res.resfail contains the following:
//
//          obj_wcc
//             A wcc_data structure containing the old and new
//             attributes for the object.
//
//    IMPLEMENTATION
//
//       The guard.check mechanism allows the client to avoid
//       changing the attributes of an object on the basis of stale
//       attributes. It does not guarantee exactly-once semantics.
//       In particular, if a reply is lost and the server does not
//       detect the retransmission of the request, the procedure
//       can fail with the error, NFS3ERR_NOT_SYNC, even though the
//       attribute setting was previously performed successfully.
//       The client can attempt to recover from this error by
//       getting fresh attributes from the server and sending a new
//       SETATTR request using the new ctime.  The client can
//       optionally check the attributes to avoid the second
//       SETATTR request if the new attributes show that the
//       attributes have already been set as desired (though it may
//       not have been the issuing client that set the
//       attributes).
//
//       The new_attributes.size field is used to request changes
//       to the size of a file. A value of 0 causes the file to be
//       truncated, a value less than the current size of the file
//       causes data from new size to the end of the file to be
//       discarded, and a size greater than the current size of the
//       file causes logically zeroed data bytes to be added to the
//       end of the file.  Servers are free to implement this using
//       holes or actual zero data bytes. Clients should not make
//       any assumptions regarding a server's implementation of
//       this feature, beyond that the bytes returned will be
//       zeroed. Servers must support extending the file size via
//       SETATTR.
//
//       SETATTR is not guaranteed atomic. A failed SETATTR may
//       partially change a file's attributes.
//
//       Changing the size of a file with SETATTR indirectly
//       changes the mtime. A client must account for this as size
//       changes can result in data deletion.
//
//       If server and client times differ, programs that compare
//       client time to file times can break. A time maintenance
//       protocol should be used to limit client/server time skew.
//
//       In a heterogeneous environment, it is quite possible that
//       the server will not be able to support the full range of
//       SETATTR requests. The error, NFS3ERR_INVAL, may be
//       returned if the server can not store a uid or gid in its
//       own representation of uids or gids, respectively.  If the
//       server can only support 32 bit offsets and sizes, a
//       SETATTR request to set the size of a file to larger than
//       can be represented in 32 bits will be rejected with this
//       same error.
//
//    ERRORS
//
//       NFS3ERR_PERM
//       NFS3ERR_IO
//       NFS3ERR_ACCES
//       NFS3ERR_INVAL
//       NFS3ERR_NOSPC
//       NFS3ERR_ROFS
//       NFS3ERR_DQUOT
//       NFS3ERR_NOT_SYNC
//       NFS3ERR_STALE
//       NFS3ERR_BADHANDLE
//       NFS3ERR_SERVERFAULT
//
//    SEE ALSO
//
//       CREATE, MKDIR, SYMLINK, and MKNOD.


var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var sattr3 = require('./sattr3');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function SetAttrCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalString(opts.object, 'opts.object');
    assert.optionalObject(opts.new_attributes, 'opts.new_attributes');
    assert.optionalObject(opts.guard, 'opts.guard');

    NfsCall.call(this, opts, true);

    this._object = opts.object || '';
    this.new_attributes = opts.new_attributes || {
        mode: null,
        uid: null,
        gid: null,
        size: null,
        how_a_time: 0,
        atime: null,
        how_m_time: 0,
        mtime: null
    };
    this.guard = opts.guard || null;

    this._nfs_set_attr_call = true; // MDB
}
util.inherits(SetAttrCall, NfsCall);
Object.defineProperty(SetAttrCall.prototype, 'object', {
    get: function object() {
        return (this._object);
    }
});


SetAttrCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this._object = xdr.readString();

        this.new_attributes = sattr3.parse(xdr);

        if (xdr.readBool()) {
            this.guard = {
                seconds: xdr.readInt(),
                nseconds: xdr.readInt()
            };
        } else {
            this.guard = null;
        }
    } else {
        this.push(chunk);
    }

    cb();
};


SetAttrCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this._object);

    len += sattr3.length(this.new_attributes);

    if (this.guard !== null) {
        len += 12;
    } else {
        len += 4;
    }

    var xdr = this._serialize(len);

    xdr.writeString(this._object);
    sattr3.serialize(xdr, this.new_attributes);

    if (this.guard !== null) {
        xdr.writeBool(true);
        xdr.writeInt(this.guard.seconds);
        xdr.writeInt(this.guard.nseconds);
    } else {
        xdr.writeBool(false);
    }

    this.write(xdr.buffer());
};


SetAttrCall.prototype.toString = function toString() {
    var fmt = '[object SetAttrCall <xid=%d, object=%s, ' +
        'new_attributes=%j, guard=%j>]';
    return (util.format(fmt, this.xid,
        this._object,
        this.new_attributes,
        this.guard));
};



///--- Exports

module.exports = {
    SetAttrCall: SetAttrCall
};
