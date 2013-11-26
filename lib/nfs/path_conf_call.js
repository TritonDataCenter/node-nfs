// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.20 Procedure 20: PATHCONF - Retrieve POSIX information
//
//    SYNOPSIS
//
//       PATHCONF3res NFSPROC3_PATHCONF(PATHCONF3args) = 20;
//
//       struct PATHCONF3args {
//                      nfs_fh3   object;
//       };
//
//       struct PATHCONF3resok {
//            post_op_attr obj_attributes;
//            uint32       linkmax;
//            uint32       name_max;
//            bool         no_trunc;
//            bool         chown_restricted;
//            bool         case_insensitive;
//            bool         case_preserving;
//       };
//
//       struct PATHCONF3resfail {
//            post_op_attr obj_attributes;
//       };
//
//       union PATHCONF3res switch (nfsstat3 status) {
//       case NFS3_OK:
//            PATHCONF3resok   resok;
//       default:
//            PATHCONF3resfail resfail;
//       };
//
//    DESCRIPTION
//
//       Procedure PATHCONF retrieves the pathconf information for
//       a file or directory. If the FSF_HOMOGENEOUS bit is set in
//       FSFINFO3resok.properties, the pathconf information will be
//       the same for all files and directories in the exported
//       file system in which this file or directory resides. On
//       entry, the arguments in PATHCONF3args are:
//
//       object
//          The file handle for the file system object.
//
//       On successful return, PATHCONF3res.status is NFS3_OK and
//       PATHCONF3res.resok contains:
//
//       obj_attributes
//          The attributes of the object specified by object.
//
//       linkmax
//          The maximum number of hard links to an object.
//
//       name_max
//          The maximum length of a component of a filename.
//
//       no_trunc
//          If TRUE, the server will reject any request that
//          includes a name longer than name_max with the error,
//          NFS3ERR_NAMETOOLONG. If FALSE, any length name over
//          name_max bytes will be silently truncated to name_max
//          bytes.
//
//       chown_restricted
//          If TRUE, the server will reject any request to change
//          either the owner or the group associated with a file if
//          the caller is not the privileged user. (Uid 0.)
//
//       case_insensitive
//          If TRUE, the server file system does not distinguish
//          case when interpreting filenames.
//
//       case_preserving
//          If TRUE, the server file system will preserve the case
//          of a name during a CREATE, MKDIR, MKNOD, SYMLINK,
//          RENAME, or LINK operation.
//
//       Otherwise, PATHCONF3res.status contains the error on
//       failure and PATHCONF3res.resfail contains the following:
//       obj_attributes
//          The attributes of the object specified by object.
//
//    IMPLEMENTATION
//
//       In some implementations of the NFS version 2 protocol,
//       pathconf information was obtained at mount time through
//       the MOUNT protocol.  The proper place to obtain it, is as
//       here, in the NFS version 3 protocol itself.
//
//    ERRORS
//
//       NFS3ERR_STALE
//       NFS3ERR_BADHANDLE
//       NFS3ERR_SERVERFAULT
//
//    SEE ALSO
//
//       LOOKUP, CREATE, MKDIR, SYMLINK, MKNOD, RENAME, LINK and FSINFO.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function PathConfCall(opts) {
    NfsCall.call(this, opts, true);

    this._object = '';

    this._nfs_path_conf_call = true; // MDB
}
util.inherits(PathConfCall, NfsCall);
Object.defineProperty(PathConfCall.prototype, 'object', {
    get: function object() {
        return (this._object);
    }
});


PathConfCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this._object = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
};


PathConfCall.prototype.writeHead = function writeHead() {
    var xdr = this._serialize(XDR.byteLength(this._object));
    xdr.writeString(this._object);

    this.write(xdr.buffer());
};


PathConfCall.prototype.toString = function toString() {
    var fmt = '[object PathConfCall <xid=%d, object=%s>]';
    return (util.format(fmt, this.xid, this._object));
};



///--- Exports

module.exports = {
    PathConfCall: PathConfCall
};
