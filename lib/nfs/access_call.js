// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.4 Procedure 4: ACCESS - Check Access Permission
//
//    SYNOPSIS
//
//       ACCESS3res NFSPROC3_ACCESS(ACCESS3args) = 4;
//
//       const ACCESS3_READ    = 0x0001;
//       const ACCESS3_LOOKUP  = 0x0002;
//       const ACCESS3_MODIFY  = 0x0004;
//       const ACCESS3_EXTEND  = 0x0008;
//       const ACCESS3_DELETE  = 0x0010;
//       const ACCESS3_EXECUTE = 0x0020;
//
//       struct ACCESS3args {
//            nfs_fh3  object;
//            uint32   access;
//       };
//
//       struct ACCESS3resok {
//            post_op_attr   obj_attributes;
//            uint32         access;
//       };
//
//       struct ACCESS3resfail {
//            post_op_attr   obj_attributes;
//       };
//
//       union ACCESS3res switch (nfsstat3 status) {
//       case NFS3_OK:
//            ACCESS3resok   resok;
//       default:
//            ACCESS3resfail resfail;
//       };
//
//    DESCRIPTION
//
//       Procedure ACCESS determines the access rights that a user,
//       as identified by the credentials in the request, has with
//       respect to a file system object. The client encodes the
//       set of permissions that are to be checked in a bit mask.
//       The server checks the permissions encoded in the bit mask.
//       A status of NFS3_OK is returned along with a bit mask
//       encoded with the permissions that the client is allowed.
//
//       The results of this procedure are necessarily advisory in
//       nature.  That is, a return status of NFS3_OK and the
//       appropriate bit set in the bit mask does not imply that
//       such access will be allowed to the file system object in
//       the future, as access rights can be revoked by the server
//       at any time.
//
//       On entry, the arguments in ACCESS3args are:
//
//       object
//          The file handle for the file system object to which
//          access is to be checked.
//
//       access
//          A bit mask of access permissions to check.
//
//       The following access permissions may be requested:
//
//          ACCESS3_READ
//             Read data from file or read a directory.
//
//          ACCESS3_LOOKUP
//             Look up a name in a directory (no meaning for
//             non-directory objects).
//
//          ACCESS3_MODIFY
//             Rewrite existing file data or modify existing
//             directory entries.
//
//          ACCESS3_EXTEND
//             Write new data or add directory entries.
//
//          ACCESS3_DELETE
//             Delete an existing directory entry.
//
//          ACCESS3_EXECUTE
//             Execute file (no meaning for a directory).
//
//       On successful return, ACCESS3res.status is NFS3_OK. The
//       server should return a status of NFS3_OK if no errors
//       occurred that prevented the server from making the
//       required access checks. The results in ACCESS3res.resok
//       are:
//
//       obj_attributes
//          The post-operation attributes of object.
//
//       access
//          A bit mask of access permissions indicating access
//          rights for the authentication credentials provided with
//          the request.
//       Otherwise, ACCESS3res.status contains the error on failure
//       and ACCESS3res.resfail contains the following:
//
//       obj_attributes
//          The attributes of object - if access to attributes is
//          permitted.
//
//    IMPLEMENTATION
//
//       In general, it is not sufficient for the client to attempt
//       to deduce access permissions by inspecting the uid, gid,
//       and mode fields in the file attributes, since the server
//       may perform uid or gid mapping or enforce additional
//       access control restrictions. It is also possible that the
//       NFS version 3 protocol server may not be in the same ID
//       space as the NFS version 3 protocol client. In these cases
//       (and perhaps others), the NFS version 3 protocol client
//       can not reliably perform an access check with only current
//       file attributes.
//
//       In the NFS version 2 protocol, the only reliable way to
//       determine whether an operation was allowed was to try it
//       and see if it succeeded or failed. Using the ACCESS
//       procedure in the NFS version 3 protocol, the client can
//       ask the server to indicate whether or not one or more
//       classes of operations are permitted.  The ACCESS operation
//       is provided to allow clients to check before doing a
//       series of operations. This is useful in operating systems
//       (such as UNIX) where permission checking is done only when
//       a file or directory is opened. This procedure is also
//       invoked by NFS client access procedure (called possibly
//       through access(2)). The intent is to make the behavior of
//       opening a remote file more consistent with the behavior of
//       opening a local file.
//
//       The information returned by the server in response to an
//       ACCESS call is not permanent. It was correct at the exact
//       time that the server performed the checks, but not
//       necessarily afterwards. The server can revoke access
//       permission at any time.
//
//       The NFS version 3 protocol client should use the effective
//       credentials of the user to build the authentication
//       information in the ACCESS request used to determine access
//       rights. It is the effective user and group credentials
//       that are used in subsequent read and write operations. See
//       the comments in Permission issues on page 98 for more
//       information on this topic.
//       Many implementations do not directly support the
//       ACCESS3_DELETE permission. Operating systems like UNIX
//       will ignore the ACCESS3_DELETE bit if set on an access
//       request on a non-directory object. In these systems,
//       delete permission on a file is determined by the access
//       permissions on the directory in which the file resides,
//       instead of being determined by the permissions of the file
//       itself.  Thus, the bit mask returned for such a request
//       will have the ACCESS3_DELETE bit set to 0, indicating that
//       the client does not have this permission.
//
//    ERRORS
//
//       NFS3ERR_IO
//       NFS3ERR_STALE
//       NFS3ERR_BADHANDLE
//       NFS3ERR_SERVERFAULT
//
//    SEE ALSO
//
//       GETATTR.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function AccessCall(opts) {
    assert.object(opts, 'options');
    assert.optionalString(opts.object, 'options.object');
    assert.optionalNumber(opts.access, 'options.access');

    NfsCall.call(this, opts, true);

    this._object = opts.object || '';
    this.access = opts.access || 0;

    this._nfs_access_call = true; // MDB
}
util.inherits(AccessCall, NfsCall);
Object.defineProperty(AccessCall.prototype, 'object', {
    get: function object() {
        return (this._object);
    }
});


AccessCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this._object = xdr.readString();
        this.access = xdr.readInt();
    } else {
        this.push(chunk);
    }

    cb();
};


AccessCall.prototype.writeHead = function writeHead() {
    var xdr = this._serialize(XDR.byteLength(this._object) + 4);
    xdr.writeString(this._object);
    xdr.writeInt(this.access);

    this.write(xdr.buffer());
};


AccessCall.prototype.toString = function toString() {
    var fmt = '[object AccessCall <xid=%d, object=%s, access=%d>]';
    return (util.format(fmt, this.xid, this._object, this.access));
};



///--- Exports

module.exports = {
    AccessCall:      AccessCall,
    ACCESS3_READ:    0x0001,
    ACCESS3_LOOKUP:  0x0002,
    ACCESS3_MODIFY:  0x0004,
    ACCESS3_EXTEND:  0x0008,
    ACCESS3_DELETE:  0x0010,
    ACCESS3_EXECUTE: 0x0020
};
