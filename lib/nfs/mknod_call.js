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


var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var sattr3 = require('./sattr3');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;

var ftype3 = {
    NF3REG:   1,
    NF3DIR:   2,
    NF3BLK:   3,
    NF3CHR:   4,
    NF3LNK:   5,
    NF3SOCK:  6,
    NF3FIFO:  7
};


///--- API

function MknodCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.where, 'opts.where');
    assert.optionalNumber(opts.type, 'opts.type');

    NfsCall.call(this, opts, true);

    this.where = opts.where || {
        dir: '',
        name: ''
    };
    this.type = opts.type;

    if (this.type === ftype3.NF3BLK || this.type === ftype3.NF3CHR) {
        this.dev_attributes = opts.dev_attributes || {
            mode: null,
            uid: null,
            gid: null,
            size: null,
            how_a_time: 0,
            atime: null,
            how_m_time: 0,
            mtime: null
        };
        this.specdata1 = opts.specdata1 || 0;
        this.specdata2 = opts.specdata2 || 0;
    } else if (this.type === ftype3.NF3SOCK || this.type === ftype3.NF3FIFO) {
        this.pipe_attributes = opts.pipe_attributes || {
            mode: null,
            uid: null,
            gid: null,
            size: null,
            how_a_time: 0,
            atime: null,
            how_m_time: 0,
            mtime: null
        };
    }

    this._nfs_mknod_call = true; // MDB
}
util.inherits(MknodCall, NfsCall);
Object.defineProperty(MknodCall.prototype, 'object', {
    get: function object() {
        return (this.where.dir);
    }
});


MknodCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.where.dir = xdr.readString();
        this.where.name = xdr.readString();
        this.type = xdr.readInt();
        if (this.type === ftype3.NF3BLK || this.type === ftype3.NF3CHR) {
            this.dev_attributes = sattr3.parse(xdr);
            this.specdata1 = xdr.readInt();
            this.specdata2 = xdr.readInt();
        } else if (this.type === ftype3.NF3SOCK ||
            this.type === ftype3.NF3FIFO) {
            this.pipe_attributes = sattr3.parse(xdr);
        }
    } else {
        this.push(chunk);
    }

    cb();
};


MknodCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this.where.dir) +
              XDR.byteLength(this.where.name) + 4;

    if (this.type === ftype3.NF3BLK || this.type === ftype3.NF3CHR) {
        len += sattr3.length(this.dev_attributes) + 8;
    } else if (this.type === ftype3.NF3SOCK || this.type === ftype3.NF3FIFO) {
        len += sattr3.length(this.pipe_attributes);
    }

    var xdr = this._serialize(len);

    xdr.writeString(this.where.dir);
    xdr.writeString(this.where.name);
    xdr.writeInt(this.type);
    if (this.type === ftype3.NF3BLK || this.type === ftype3.NF3CHR) {
        sattr3.serialize(xdr, this.dev_attributes);
        xdr.writeInt(this.specdata1);
        xdr.writeInt(this.specdata2);
    } else if (this.type === ftype3.NF3SOCK || this.type === ftype3.NF3FIFO) {
        sattr3.serialize(xdr, this.pipe_attributes);
    }

    this.write(xdr.buffer());
};


MknodCall.prototype.toString = function toString() {
    var fmt = '[object MknodCall <xid=%d, where=%j, type=%d>]';
    return (util.format(fmt, this.xid, this.where, this.type));
};


///--- Exports

module.exports = {
    MknodCall: MknodCall,
    ftype3: ftype3
};
