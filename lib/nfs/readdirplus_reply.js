// Copyright 2014 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.17 Procedure 17: READDIRPLUS - Extended read from directory
//
//   SYNOPSIS
//
//      READDIRPLUS3res NFSPROC3_READDIRPLUS(READDIRPLUS3args) = 17;
//
//      struct READDIRPLUS3args {
//           nfs_fh3      dir;
//           cookie3      cookie;
//           cookieverf3  cookieverf;
//           count3       dircount;
//           count3       maxcount;
//      };
//
//      struct entryplus3 {
//           fileid3      fileid;
//           filename3    name;
//           cookie3      cookie;
//           post_op_attr name_attributes;
//           post_op_fh3  name_handle;
//           entryplus3   *nextentry;
//      };
//
//      struct dirlistplus3 {
//           entryplus3   *entries;
//           bool         eof;
//      };
//
//      struct READDIRPLUS3resok {
//           post_op_attr dir_attributes;
//           cookieverf3  cookieverf;
//           dirlistplus3 reply;
//      };
//
//      struct READDIRPLUS3resfail {
//           post_op_attr dir_attributes;
//      };
//
//      union READDIRPLUS3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           READDIRPLUS3resok   resok;
//      default:
//           READDIRPLUS3resfail resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure READDIRPLUS retrieves a variable number of
//      entries from a file system directory and returns complete
//      information about each along with information to allow the
//      client to request additional directory entries in a
//      subsequent READDIRPLUS.  READDIRPLUS differs from READDIR
//      only in the amount of information returned for each
//      entry.  In READDIR, each entry returns the filename and
//      the fileid.  In READDIRPLUS, each entry returns the name,
//      the fileid, attributes (including the fileid), and file
//      handle. On entry, the arguments in READDIRPLUS3args are:
//
//      dir
//         The file handle for the directory to be read.
//
//      cookie
//         This should be set to 0 on the first request to read a
//         directory. On subsequent requests, it should be a
//         cookie as returned by the server.
//
//      cookieverf
//         This should be set to 0 on the first request to read a
//         directory. On subsequent requests, it should be a
//         cookieverf as returned by the server. The cookieverf
//         must match that returned by the READDIRPLUS call in
//         which the cookie was acquired.
//
//      dircount
//         The maximum number of bytes of directory information
//         returned. This number should not include the size of
//         the attributes and file handle portions of the result.
//
//      maxcount
//         The maximum size of the READDIRPLUS3resok structure, in
//         bytes. The size must include all XDR overhead. The
//         server is free to return fewer than maxcount bytes of
//         data.
//
//      On successful return, READDIRPLUS3res.status is NFS3_OK
//      and READDIRPLUS3res.resok contains:
//
//      dir_attributes
//         The attributes of the directory, dir.
//
//      cookieverf
//         The cookie verifier.
//
//      reply
//         The directory list:
//
//         entries
//            Zero or more directory (entryplus3) entries.
//
//         eof
//            TRUE if the last member of reply.entries is the last
//            entry in the directory or the list reply.entries is
//            empty and the cookie corresponded to the end of the
//            directory. If FALSE, there may be more entries to
//            read.
//
//      Otherwise, READDIRPLUS3res.status contains the error on
//      failure and READDIRPLUS3res.resfail contains the following:
//
//      dir_attributes
//         The attributes of the directory, dir.
//
//   IMPLEMENTATION
//
//      Issues that need to be understood for this procedure
//      include increased cache flushing activity on the client
//      (as new file handles are returned with names which are
//      entered into caches) and over-the-wire overhead versus
//      expected subsequent LOOKUP elimination. It is thought that
//      this procedure may improve performance for directory
//      browsing where attributes are always required as on the
//      Apple Macintosh operating system and for MS-DOS.
//
//      The dircount and maxcount fields are included as an
//      optimization.  Consider a READDIRPLUS call on a UNIX
//      operating system implementation for 1048 bytes; the reply
//      does not contain many entries because of the overhead due
//      to attributes and file handles. An alternative is to issue
//      a READDIRPLUS call for 8192 bytes and then only use the
//      first 1048 bytes of directory information. However, the
//      server doesn't know that all that is needed is 1048 bytes
//      of directory information (as would be returned by
//      READDIR). It sees the 8192 byte request and issues a
//      VOP_READDIR for 8192 bytes. It then steps through all of
//      those directory entries, obtaining attributes and file
//      handles for each entry.  When it encodes the result, the
//      server only encodes until it gets 8192 bytes of results
//      which include the attributes and file handles. Thus, it
//      has done a larger VOP_READDIR and many more attribute
//      fetches than it needed to. The ratio of the directory
//      entry size to the size of the attributes plus the size of
//      the file handle is usually at least 8 to 1. The server has
//      done much more work than it needed to.
//
//      The solution to this problem is for the client to provide
//      two counts to the server. The first is the number of bytes
//      of directory information that the client really wants,
//      dircount.  The second is the maximum number of bytes in
//      the result, including the attributes and file handles,
//      maxcount. Thus, the server will issue a VOP_READDIR for
//      only the number of bytes that the client really wants to
//      get, not an inflated number.  This should help to reduce
//      the size of VOP_READDIR requests on the server, thus
//      reducing the amount of work done there, and to reduce the
//      number of VOP_LOOKUP, VOP_GETATTR, and other calls done by
//      the server to construct attributes and file handles.
//
//   ERRORS
//
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_NOTDIR
//      NFS3ERR_BAD_COOKIE
//      NFS3ERR_TOOSMALL
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_NOTSUPP
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      READDIR.

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

function ReaddirplusReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.dir_attributes = null;
    this.cookieverf = null;
    this.reply = [];
    this.eof = false;

    this._nfs_readdirplus_reply = true; // MDB
}
util.inherits(ReaddirplusReply, NfsReply);
ReaddirplusReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_ACCES,
    nfs_err.NFS3ERR_NOTDIR,
    nfs_err.NFS3ERR_BAD_COOKIE,
    nfs_err.NFS3ERR_TOOSMALL,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


ReaddirplusReply.prototype.setAttributes = function setAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.dir_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};
ReaddirplusReply.prototype.setDirAttributes =
    ReaddirplusReply.prototype.setAttributes;


ReaddirplusReply.prototype.addEntry = function addEntry(e) {
    assert.object(e, 'entry');
    assert.number(e.fileid, 'entry.fileid');
    assert.string(e.name, 'entry.name');
    assert.number(e.cookie, 'entry.cookie');

    this.reply.push(clone(e));
};


ReaddirplusReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        if (xdr.readBool())
            this.dir_attributes = fattr3.parse(xdr);
        if (this.status === 0) {
            this.cookieverf = xdr.readRaw(8);

            while (xdr.readBool()) {
                var entry = {
                    fileid: xdr.readHyper(),
                    name: xdr.readString(),
                    cookie: xdr.readHyper()
                };
                if (xdr.readBool())
                    entry.name_attributes = fattr3.parse(xdr);
                if (xdr.readBool())
                    entry.name_handle = xdr.readString();

                this.reply.push(entry);
            }

            this.eof = xdr.readBool();
        }
    } else {
        this.push(chunk);
    }

    cb();
};


ReaddirplusReply.prototype.writeHead = function writeHead() {
    // status (4) + bool_dir_attrs (4) + size_dir_attrs
    var len = 4 + 4 + this.dir_attributes ? fattr3.XDR_SIZE : 0;

    if (this.status === 0) {
        // cookieverf3 (8) + final_list_false (4) + bool_eof (4)
        // XXX why is the following not 16?
        len += 24;
        len += this.reply.reduce(function (p, r) {
            // list_true (4) + fileid (8) + cookie (8) + name_len +
            // bool_name_attr (4) + name_attr_len +
            // bool_name_handle (4)  name_handle_len
            return (p + 28 + XDR.byteLength(r.name) +
                (r.name_attributes ? fattr3.XDR_SIZE : 0) +
                (r.name_handle ? 64 : 0));
        }, 0);
    }

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);
    if (this.dir_attributes) {
        xdr.writeBool(true);
        fattr3.serialize(xdr, this.dir_attributes);
    } else {
        xdr.writeBool(false);
    }

    if (this.status === 0) {
        if (!this.cookieverf) {
            this.cookieverf = new Buffer(8);
            this.cookieverf.fill(0);
        }
        xdr.writeRaw(this.cookieverf);

        this.reply.forEach(function (r, i) {
            xdr.writeBool(true); // value follows
            xdr.writeHyper(r.fileid);
            xdr.writeString(r.name);
            xdr.writeHyper(r.cookie);
            if (r.name_attributes) {
                xdr.writeBool(true);
                fattr3.serialize(xdr, r.name_attributes);
            } else {
                xdr.writeBool(false);
            }
            if (r.name_handle) {
                xdr.writeBool(true);
                xdr.writeString(r.name_handle);
            } else {
                xdr.writeBool(false);
            }
        });

        xdr.writeBool(false); // no more values
        xdr.writeBool(this.eof);
    }

    this.write(xdr.buffer());
};


ReaddirplusReply.prototype.toString = function toString() {
    var fmt = '[object ReaddirplusReply <xid=%d, status=%d, ' +
        'dir_attributes=%j, cookieverf=%j, reply=%j, eof=%s>]';
    return (util.format(fmt, this.xid, this.status, this.dir_attributes,
        this.cookieverf, this.reply, this.eof));
};



///--- Exports

module.exports = {
    ReaddirplusReply: ReaddirplusReply
};
