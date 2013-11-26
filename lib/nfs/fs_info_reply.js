// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.19 Procedure 19: FSINFO - Get static file system Information
//
//    SYNOPSIS
//
//       FSINFO3res NFSPROC3_FSINFO(FSINFO3args) = 19;
//
//       const FSF3_LINK        = 0x0001;
//       const FSF3_SYMLINK     = 0x0002;
//       const FSF3_HOMOGENEOUS = 0x0008;
//       const FSF3_CANSETTIME  = 0x0010;
//
//       struct FSINFOargs {
//            nfs_fh3   fsroot;
//       };
//
//       struct FSINFO3resok {
//            post_op_attr obj_attributes;
//            uint32       rtmax;
//            uint32       rtpref;
//            uint32       rtmult;
//            uint32       wtmax;
//            uint32       wtpref;
//            uint32       wtmult;
//            uint32       dtpref;
//            size3        maxfilesize;
//            nfstime3     time_delta;
//            uint32       properties;
//       };
//
//       struct FSINFO3resfail {
//            post_op_attr obj_attributes;
//       };
//
//       union FSINFO3res switch (nfsstat3 status) {
//       case NFS3_OK:
//            FSINFO3resok   resok;
//       default:
//            FSINFO3resfail resfail;
//       };
//
//    DESCRIPTION
//
//       Procedure FSINFO retrieves nonvolatile file system state
//       information and general information about the NFS version
//       3 protocol server implementation. On entry, the arguments
//       in FSINFO3args are:
//
//       fsroot
//          A file handle identifying a file object. Normal usage
//          is to provide a file handle for a mount point for a
//          file system, as originally obtained from the MOUNT
//          service on the server.
//
//       On successful return, FSINFO3res.status is NFS3_OK and
//       FSINFO3res.resok contains:
//
//       obj_attributes
//          The attributes of the file system object specified in
//          fsroot.
//
//       rtmax
//          The maximum size in bytes of a READ request supported
//          by the server. Any READ with a number greater than
//          rtmax will result in a short read of rtmax bytes or
//          less.
//
//       rtpref
//          The preferred size of a READ request. This should be
//          the same as rtmax unless there is a clear benefit in
//          performance or efficiency.
//
//       rtmult
//          The suggested multiple for the size of a READ request.
//
//       wtmax
//          The maximum size of a WRITE request supported by the
//          server.  In general, the client is limited by wtmax
//          since there is no guarantee that a server can handle a
//          larger write. Any WRITE with a count greater than wtmax
//          will result in a short write of at most wtmax bytes.
//
//       wtpref
//          The preferred size of a WRITE request. This should be
//          the same as wtmax unless there is a clear benefit in
//          performance or efficiency.
//
//       wtmult
//          The suggested multiple for the size of a WRITE
//          request.
//
//       dtpref
//          The preferred size of a READDIR request.
//
//       maxfilesize
//          The maximum size of a file on the file system.
//
//       time_delta
//          The server time granularity. When setting a file time
//          using SETATTR, the server guarantees only to preserve
//          times to this accuracy. If this is {0, 1}, the server
//          can support nanosecond times, {0, 1000000} denotes
//          millisecond precision, and {1, 0} indicates that times
//          are accurate only to the nearest second.
//
//       properties
//          A bit mask of file system properties. The following
//          values are defined:
//
//          FSF_LINK
//             If this bit is 1 (TRUE), the file system supports
//             hard links.
//
//          FSF_SYMLINK
//             If this bit is 1 (TRUE), the file system supports
//             symbolic links.
//
//          FSF_HOMOGENEOUS
//             If this bit is 1 (TRUE), the information returned by
//             PATHCONF is identical for every file and directory
//             in the file system. If it is 0 (FALSE), the client
//             should retrieve PATHCONF information for each file
//             and directory as required.
//
//          FSF_CANSETTIME
//             If this bit is 1 (TRUE), the server will set the
//             times for a file via SETATTR if requested (to the
//             accuracy indicated by time_delta). If it is 0
//             (FALSE), the server cannot set times as requested.
//
//       Otherwise, FSINFO3res.status contains the error on failure
//       and FSINFO3res.resfail contains the following:
//
//       attributes
//          The attributes of the file system object specified in
//          fsroot.
//
//    IMPLEMENTATION
//
//       Not all implementations can support the entire list of
//       attributes. It is expected that a server will make a best
//       effort at supporting all the attributes.
//
//       The file handle provided is expected to be the file handle
//       of the file system root, as returned to the MOUNT
//       operation.  Since mounts may occur anywhere within an
//       exported tree, the server should expect FSINFO requests
//       specifying file handles within the exported file system.
//       A server may export different types of file systems with
//       different attributes returned to the FSINFO call. The
//       client should retrieve FSINFO information for each mount
//       completed. Though a server may return different FSINFO
//       information for different files within a file system,
//       there is no requirement that a client obtain FSINFO
//       information for other than the file handle returned at
//       mount.
//
//       The maxfilesize field determines whether a server's
//       particular file system uses 32 bit sizes and offsets or 64
//       bit file sizes and offsets. This may affect a client's
//       processing.
//
//       The preferred sizes for requests are nominally tied to an
//       exported file system mounted by a client. A surmountable
//       issue arises in that the transfer size for an NFS version
//       3 protocol request is not only dependent on
//       characteristics of the file system but also on
//       characteristics of the network interface, particularly the
//       maximum transfer unit (MTU). A server implementation can
//       advertise different transfer sizes (for the fields, rtmax,
//       rtpref, wtmax, wtpref, and dtpref) depending on the
//       interface on which the FSINFO request is received. This is
//       an implementation issue.
//
//    ERRORS
//
//       NFS3ERR_STALE
//       NFS3ERR_BADHANDLE
//       NFS3ERR_SERVERFAULT
//
//    SEE ALSO
//
//       READLINK, WRITE, READDIR, FSSTAT and PATHCONF.

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

function FsInfoReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.obj_attributes = null;
    this.rtmax = 0;
    this.rtpref = 0;
    this.rtmult = 0;
    this.wtmax = 0;
    this.wtmult = 0;
    this.dtpref = 0;
    this.maxfilesize = 0;
    this.time_delta = {
        seconds: 0,
        nseconds: 0
    };
    this.properties = 0;

    this._nfs_fs_info_reply = true; // MDB
}
util.inherits(FsInfoReply, NfsReply);
FsInfoReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


FsInfoReply.prototype.setAttributes = function setAttributes(stats) {
    assert.ok(stats instanceof fs.Stats, 'fs.Stats');

    this.obj_attributes = fattr3.create(stats);

    return (this.obj_attributes);
};


FsInfoReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        if (this.status === 0) {
            if (xdr.readBool())
                this.obj_attributes = fattr3.parse(xdr);
            this.rtmax = xdr.readInt();
            this.rtpref = xdr.readInt();
            this.rtmult = xdr.readInt();
            this.wtmax = xdr.readInt();
            this.wtpref = xdr.readInt();
            this.wtmult = xdr.readInt();
            this.dtpref = xdr.readInt();
            this.maxfilesize = xdr.readHyper();
            this.time_delta = {
                seconds: xdr.readInt(),
                nseconds: xdr.readInt()
            };
            this.properties = xdr.readInt();
        } else {
            if (xdr.readBool())
                this.obj_attributes = fattr3.parse(xdr);
        }
    } else {
        this.push(chunk);
    }

    cb();
};


FsInfoReply.prototype.writeHead = function writeHead() {
    var len = 8;
    if (this.obj_attributes)
        len += fattr3.XDR_SIZE;

    if (this.status === 0)
        len += 48;

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);

    if (this.obj_attributes) {
        xdr.writeBool(true);
        fattr3.serialize(xdr, this.obj_attributes);
    } else {
        xdr.writeBool(false);
    }

    if (this.status === 0) {
        xdr.writeInt(this.rtmax);
        xdr.writeInt(this.rtpref);
        xdr.writeInt(this.rtmult);
        xdr.writeInt(this.wtmax);
        xdr.writeInt(this.wtpref);
        xdr.writeInt(this.wtmult);
        xdr.writeInt(this.dtpref);
        xdr.writeHyper(this.maxfilesize);
        xdr.writeInt(this.time_delta.seconds);
        xdr.writeInt(this.time_delta.nseconds);
        xdr.writeInt(this.properties);
    }

    this.write(xdr.buffer());
};


FsInfoReply.prototype.toString = function toString() {
    var fmt = '[object FsInfoReply <xid=%d, status=%d, attributes=%j' +
        'rtmax=%d, rtpref=%d, rtmult=%d, wtmax=%d, wtmult=%d, dtpref=%d' +
        'maxfilesize=%d, time_delta=%j, properties=%d>]';
    return (util.format(fmt,
                        this.xid,
                        this.status,
                        this.obj_attributes,
                        this.rtmax,
                        this.rtpref,
                        this.rtmult,
                        this.wtmax,
                        this.wtmult,
                        this.dtpref,
                        this.maxfilesize,
                        this.time_delta,
                        this.properties));
};



///--- Exports

module.exports = {
    FsInfoReply: FsInfoReply,
    FSF3_LINK: 0x0001,
    FSF3_SYMLINK: 0x0002,
    FSF3_HOMOGENOUS: 0x0008,
    FSF3_CANSETTIME: 0x0010
};
