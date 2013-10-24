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

var fs = require('fs');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var nfs_err = require('./errors');
var fattr3 = require('./fattr3');
var NfsReply = require('./nfs_reply').NfsReply;



///--- Globals

var XDR = rpc.XDR;



///--- API

function PathConfReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.obj_attributes = null;
    this.linkmax = 0;
    this.name_max = 0;
    this.no_trunc = true;
    this.chown_restricted = true;
    this.case_insensitive = false;
    this.case_preserving = true;

    this._nfs_path_conf_reply = true; // MDB
}
util.inherits(PathConfReply, NfsReply);
PathConfReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


PathConfReply.prototype.setAttributes = function setAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.obj_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};


PathConfReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        if (this.status === 0) {
            if (xdr.readBool())
                this.obj_attributes = fattr3.parse(xdr);

            this.linkmax = xdr.readInt();
            this.name_max = xdr.readInt();
            this.no_trunc = xdr.readBool();
            this.chown_restricted = xdr.readBool();
            this.case_insensitive = xdr.readBool();
            this.case_preserving = xdr.readBool();
        }
    } else {
        this.push(chunk);
    }

    cb();
};


PathConfReply.prototype.writeHead = function writeHead() {
    var len = 8;
    if (this.status === 0)
        len += fattr3.XDR_SIZE + 24;

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    if (this.obj_attributes) {
        xdr.writeBool(true);
        fattr3.serialize(xdr, this.obj_attributes);
    } else {
        xdr.writeBool(false);
    }

    if (this.status === 0) {
        xdr.writeInt(this.linkmax);
        xdr.writeInt(this.name_max);
        xdr.writeBool(this.no_trunc);
        xdr.writeBool(this.chown_restricted);
        xdr.writeBool(this.case_insensitive);
        xdr.writeBool(this.case_preserving);
    }

    this.write(xdr.buffer());
};


PathConfReply.prototype.toString = function toString() {
    var fmt = '[object PathConfReply <xid=%d, status=%d, attributes=%j' +
        'linkmax=%d, name_max=%d, no_trunc=%s, chown_restricted=%s, ' +
        'case_insensitive=%s, case_preserving=%s>]';
    return (util.format(fmt,
                        this.xid,
                        this.status,
                        this.obj_attributes,
                        this.linkmax,
                        this.name_max,
                        this.no_trunc,
                        this.chown_restricted,
                        this.case_insensitive,
                        this.case_preserving));
};



///--- Exports

module.exports = {
    PathConfReply: PathConfReply
};
