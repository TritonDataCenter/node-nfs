// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.15 Procedure 15: LINK - Create Link to an object
//
//   SYNOPSIS
//
//      LINK3res NFSPROC3_LINK(LINK3args) = 15;
//
//      struct LINK3args {
//           nfs_fh3     file;
//           diropargs3  link;
//      };
//
//      struct LINK3resok {
//           post_op_attr   file_attributes;
//           wcc_data       linkdir_wcc;
//      };
//
//      struct LINK3resfail {
//           post_op_attr   file_attributes;
//           wcc_data       linkdir_wcc;
//      };
//
//      union LINK3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           LINK3resok    resok;
//      default:
//           LINK3resfail  resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure LINK creates a hard link from file to link.name,
//      in the directory, link.dir. file and link.dir must reside
//      on the same file system and server. On entry, the
//      arguments in LINK3args are:
//
//      file
//         The file handle for the existing file system object.
//
//      link
//         The location of the link to be created:
//
//         link.dir
//            The file handle for the directory in which the link
//            is to be created.
//
//         link.name
//            The name that is to be associated with the created
//            link. Refer to General comments on filenames on page
//            17.
//
//      On successful return, LINK3res.status is NFS3_OK and
//      LINK3res.resok contains:
//
//      file_attributes
//         The post-operation attributes of the file system object
//         identified by file.
//
//      linkdir_wcc
//         Weak cache consistency data for the directory,
//         link.dir.
//
//      Otherwise, LINK3res.status contains the error on failure
//      and LINK3res.resfail contains the following:
//
//      file_attributes
//         The post-operation attributes of the file system object
//         identified by file.
//
//      linkdir_wcc
//         Weak cache consistency data for the directory,
//         link.dir.
//
//   IMPLEMENTATION
//
//      Changes to any property of the hard-linked files are
//      reflected in all of the linked files. When a hard link is
//      made to a file, the attributes for the file should have a
//      value for nlink that is one greater than the value before
//      the LINK.
//
//      The comments under RENAME regarding object and target
//      residing on the same file system apply here as well. The
//      comments regarding the target name applies as well. Refer
//      to General comments on filenames on page 30.
//
//   ERRORS
//
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_EXIST
//      NFS3ERR_XDEV
//      NFS3ERR_NOTDIR
//      NFS3ERR_INVAL
//      NFS3ERR_NOSPC
//      NFS3ERR_ROFS
//      NFS3ERR_MLINK
//      NFS3ERR_NAMETOOLONG
//      NFS3ERR_DQUOT
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_NOTSUPP
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      SYMLINK, RENAME and FSINFO.


var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function LinkCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalString(opts.file, 'options.file');
    assert.optionalObject(opts.link, 'opts.link');

    NfsCall.call(this, opts, true);

    this.file = opts.file || '';
    this.link = opts.link || {
        dir: '',
        name: ''
    };

    this._nfs_link_call = true; // MDB
}
util.inherits(LinkCall, NfsCall);
Object.defineProperty(LinkCall.prototype, 'object', {
    get: function object() {
        return (this.file);
    }
});


LinkCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.file = xdr.readString();
        this.link.dir = xdr.readString();
        this.link.name = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
};


LinkCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this.file) + XDR.byteLength(this.link.dir) +
        XDR.byteLength(this.link.name);

    var xdr = this._serialize(len);

    xdr.writeString(this.file);
    xdr.writeString(this.link.dir);
    xdr.writeString(this.link.name);

    this.write(xdr.buffer());
};


LinkCall.prototype.toString = function toString() {
    var fmt = '[object LinkCall <xid=%d, file=%s, link=%j>]';
    return (util.format(fmt, this.xid, this.file, this.link));
};



///--- Exports

module.exports = {
    LinkCall: LinkCall
};
