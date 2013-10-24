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

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var NfsCall = require('./nfs_call').NfsCall;


///--- Globals

var XDR = rpc.XDR;



///--- API

function FsInfoCall(opts) {
    NfsCall.call(this, opts, true);

    this.fsroot = opts.fsroot || '';

    this._nfs_fs_info_call = true; // MDB
}
util.inherits(FsInfoCall, NfsCall);
Object.defineProperty(FsInfoCall.prototype, 'object', {
    get: function object() {
        return (this.fsroot);
    }
});


FsInfoCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.fsroot = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
};


FsInfoCall.prototype.writeHead = function writeHead() {
    var xdr = this._serialize(XDR.byteLength(this.fsroot));
    xdr.writeString(this.fsroot);

    this.write(xdr.buffer());
};


FsInfoCall.prototype.toString = function toString() {
    var fmt = '[object FsInfoCall <xid=%d, fsroot=%s>]';
    return (util.format(fmt, this.xid, this.fsroot));
};



///--- Exports

module.exports = {
    FsInfoCall: FsInfoCall
};
