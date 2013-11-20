// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.11 Procedure 11: MKNOD - Create a special device
//
//   SYNOPSIS
//
//      MKNOD3res NFSPROC3_MKNOD(MKNOD3args) = 11;
//
//      struct devicedata3 {
//           sattr3     dev_attributes;
//           specdata3  spec;
//      };
//
//      union mknoddata3 switch (ftype3 type) {
//      case NF3CHR:
//      case NF3BLK:
//           devicedata3  device;
//      case NF3SOCK:
//      case NF3FIFO:
//           sattr3       pipe_attributes;
//      default:
//           void;
//      };
//
//      struct MKNOD3args {
//           diropargs3   where;
//           mknoddata3   what;
//      };
//
//      struct MKNOD3resok {
//           post_op_fh3   obj;
//           post_op_attr  obj_attributes;
//           wcc_data      dir_wcc;
//      };
//
//      struct MKNOD3resfail {
//           wcc_data      dir_wcc;
//      };
//
//      union MKNOD3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           MKNOD3resok   resok;
//      default:
//           MKNOD3resfail resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure MKNOD creates a new special file of the type,
//      what.type.  Special files can be device files or named
//      pipes.  On entry, the arguments in MKNOD3args are:
//
//      where
//         The location of the special file to be created:
//
//         dir
//            The file handle for the directory in which the
//            special file is to be created.
//
//         name
//            The name that is to be associated with the created
//            special file. Refer to General comments on filenames
//            on page 30.
//
//      what
//         A discriminated union identifying the type of the
//         special file to be created along with the data and
//         attributes appropriate to the type of the special
//         file:
//
//         type
//            The type of the object to be created.
//
//      When creating a character special file (what.type is
//      NF3CHR) or a block special file (what.type is NF3BLK),
//      what includes:
//
//      device
//         A structure devicedata3 with the following components:
//
//         dev_attributes
//            The initial attributes for the special file.
//
//         spec
//            The major number stored in device.spec.specdata1 and
//            the minor number stored in device.spec.specdata2.
//
//      When creating a socket (what.type is NF3SOCK) or a FIFO
//      (what.type is NF3FIFO), what includes:
//
//         pipe_attributes
//            The initial attributes for the special file.
//
//      On successful return, MKNOD3res.status is NFS3_OK and
//      MKNOD3res.resok contains:
//
//      obj
//         The file handle for the newly created special file.
//
//      obj_attributes
//         The attributes for the newly created special file.
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires only the
//         post-MKNOD directory attributes, these can be found in
//         dir_wcc.after.
//
//      Otherwise, MKNOD3res.status contains the error on failure
//      and MKNOD3res.resfail contains the following:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires only the
//         post-MKNOD directory attributes, these can be found in
//         dir_wcc.after. Even though the MKNOD failed, full
//         wcc_data is returned to allow the client to determine
//         whether the failing MKNOD changed the directory.
//
//   IMPLEMENTATION
//
//      Refer to General comments on filenames on page 30.
//
//      Without explicit support for special file type creation in
//      the NFS version 2 protocol, fields in the CREATE arguments
//      were overloaded to indicate creation of certain types of
//      objects.  This overloading is not necessary in the NFS
//      version 3 protocol.
//
//      If the server does not support any of the defined types,
//      the error, NFS3ERR_NOTSUPP, should be returned. Otherwise,
//      if the server does not support the target type or the
//      target type is illegal, the error, NFS3ERR_BADTYPE, should
//      be returned. Note that NF3REG, NF3DIR, and NF3LNK are
//      illegal types for MKNOD. The procedures, CREATE, MKDIR,
//      and SYMLINK should be used to create these file types,
//      respectively, instead of MKNOD.
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
//      NFS3ERR_BADTYPE
//
//   SEE ALSO
//
//      CREATE, MKDIR, SYMLINK, and PATHCONF.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var nfs_err = require('./errors');
var fattr3 = require('./fattr3');
var wcc_data = require('./wcc_data');
var NfsReply = require('./nfs_reply').NfsReply;



///--- Globals

var XDR = rpc.XDR;



///--- API

function MknodReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.obj = '';
    this.obj_attributes = opts.obj_attributes | null;
    this.dir_wcc = opts.dir_wcc | null;

    this._nfs_mknod_reply = true; // MDB
}
util.inherits(MknodReply, NfsReply);
MknodReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_ACCES,
    nfs_err.NFS3ERR_EXIST,
    nfs_err.NFS3ERR_NOTDIR,
    nfs_err.NFS3ERR_NOSPC,
    nfs_err.NFS3ERR_ROFS,
    nfs_err.NFS3ERR_NAMETOOLONG,
    nfs_err.NFS3ERR_DQUOT,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_NOTSUPP,
    nfs_err.NFS3ERR_SERVERFAULT,
    nfs_err.NFS3ERR_BADTYPE
];


MknodReply.prototype.setObjAttributes = function setObjAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.obj_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};


MknodReply.prototype.set_dir_wcc = function set_dir_wcc() {
    this.dir_wcc = wcc_data.create();
    return (this.dir_wcc);
};


MknodReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        if (this.status === 0) {
            if (xdr.readBool())
                this.obj = xdr.readString();
            if (xdr.readBool())
                this.obj_attributes = fattr3.parse(xdr);
        }

        this.dir_wcc = wcc_data.parse(xdr);
    } else {
        this.push(chunk);
    }

    cb();
};


MknodReply.prototype.writeHead = function writeHead() {
    var len = 4;

    if (this.status === 0) {
        len += 4 + XDR.byteLength(this.obj);

        len += 4;
        if (this.obj_attributes)
            len += fattr3.XDR_SIZE;
    }

    len += wcc_data.length(this.dir_wcc);

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    if (this.status === 0) {
        xdr.writeBool(true);
        xdr.writeString(this.obj);
        if (this.obj_attributes) {
            xdr.writeBool(true);
            fattr3.serialize(xdr, this.obj_attributes);
        } else {
            xdr.writeBool(false);
        }
    }

    wcc_data.serialize(xdr, this.dir_wcc);

    this.write(xdr.buffer());
};


MknodReply.prototype.toString = function toString() {
    var fmt = '[object MknodReply <xid=%d, status=%d, obj=%j, ' +
        'obj_attributes=%j, dir_wcc=%j>]';
    return (util.format(fmt, this.xid, this.status, this.obj,
        this.obj_attributes, this.dir_wcc));
};



///--- Exports

module.exports = {
    MknodReply: MknodReply
};
