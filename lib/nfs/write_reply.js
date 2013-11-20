// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.7 Procedure 7: WRITE - Write to file
//
//   SYNOPSIS
//
//      WRITE3res NFSPROC3_WRITE(WRITE3args) = 7;
//
//      enum stable_how {
//           UNSTABLE  = 0,
//           DATA_SYNC = 1,
//           FILE_SYNC = 2
//      };
//
//      struct WRITE3args {
//           nfs_fh3     file;
//           offset3     offset;
//           count3      count;
//           stable_how  stable;
//           opaque      data<>;
//      };
//
//      struct WRITE3resok {
//           wcc_data    file_wcc;
//           count3      count;
//           stable_how  committed;
//           writeverf3  verf;
//      };
//
//      struct WRITE3resfail {
//           wcc_data    file_wcc;
//      };
//
//      union WRITE3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           WRITE3resok    resok;
//      default:
//           WRITE3resfail  resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure WRITE writes data to a file. On entry, the
//      arguments in WRITE3args are:
//
//      file
//         The file handle for the file to which data is to be
//         written.  This must identify a file system object of
//         type, NF3REG.
//
//      offset
//         The position within the file at which the write is to
//         begin.  An offset of 0 means to write data starting at
//         the beginning of the file.
//
//      count
//         The number of bytes of data to be written. If count is
//         0, the WRITE will succeed and return a count of 0,
//         barring errors due to permissions checking. The size of
//         data must be less than or equal to the value of the
//         wtmax field in the FSINFO reply structure for the file
//         system that contains file. If greater, the server may
//         write only wtmax bytes, resulting in a short write.
//
//      stable
//         If stable is FILE_SYNC, the server must commit the data
//         written plus all file system metadata to stable storage
//         before returning results. This corresponds to the NFS
//         version 2 protocol semantics. Any other behavior
//         constitutes a protocol violation. If stable is
//         DATA_SYNC, then the server must commit all of the data
//         to stable storage and enough of the metadata to
//         retrieve the data before returning.  The server
//         implementor is free to implement DATA_SYNC in the same
//         fashion as FILE_SYNC, but with a possible performance
//         drop.  If stable is UNSTABLE, the server is free to
//         commit any part of the data and the metadata to stable
//         storage, including all or none, before returning a
//         reply to the client. There is no guarantee whether or
//         when any uncommitted data will subsequently be
//         committed to stable storage. The only guarantees made
//         by the server are that it will not destroy any data
//         without changing the value of verf and that it will not
//         commit the data and metadata at a level less than that
//         requested by the client. See the discussion on COMMIT
//         on page 92 for more information on if and when
//         data is committed to stable storage.
//
//      data
//         The data to be written to the file.
//
//      On successful return, WRITE3res.status is NFS3_OK and
//      WRITE3res.resok contains:
//
//      file_wcc
//         Weak cache consistency data for the file. For a client
//         that requires only the post-write file attributes,
//         these can be found in file_wcc.after.
//
//      count
//         The number of bytes of data written to the file. The
//         server may write fewer bytes than requested. If so, the
//         actual number of bytes written starting at location,
//         offset, is returned.
//
//      committed
//         The server should return an indication of the level of
//         commitment of the data and metadata via committed. If
//         the server committed all data and metadata to stable
//         storage, committed should be set to FILE_SYNC. If the
//         level of commitment was at least as strong as
//         DATA_SYNC, then committed should be set to DATA_SYNC.
//         Otherwise, committed must be returned as UNSTABLE. If
//         stable was FILE_SYNC, then committed must also be
//         FILE_SYNC: anything else constitutes a protocol
//         violation. If stable was DATA_SYNC, then committed may
//         be FILE_SYNC or DATA_SYNC: anything else constitutes a
//         protocol violation. If stable was UNSTABLE, then
//         committed may be either FILE_SYNC, DATA_SYNC, or
//         UNSTABLE.
//
//      verf
//         This is a cookie that the client can use to determine
//         whether the server has changed state between a call to
//         WRITE and a subsequent call to either WRITE or COMMIT.
//         This cookie must be consistent during a single instance
//         of the NFS version 3 protocol service and must be
//         unique between instances of the NFS version 3 protocol
//         server, where uncommitted data may be lost.
//
//      Otherwise, WRITE3res.status contains the error on failure
//      and WRITE3res.resfail contains the following:
//
//      file_wcc
//         Weak cache consistency data for the file. For a client
//         that requires only the post-write file attributes,
//         these can be found in file_wcc.after. Even though the
//         write failed, full wcc_data is returned to allow the
//         client to determine whether the failed write resulted
//         in any change to the file.
//
//      If a client writes data to the server with the stable
//      argument set to UNSTABLE and the reply yields a committed
//      response of DATA_SYNC or UNSTABLE, the client will follow
//      up some time in the future with a COMMIT operation to
//      synchronize outstanding asynchronous data and metadata
//      with the server's stable storage, barring client error. It
//      is possible that due to client crash or other error that a
//      subsequent COMMIT will not be received by the server.
//
//   IMPLEMENTATION
//
//      The nfsdata type used for the READ and WRITE operations in
//      the NFS version 2 protocol defining the data portion of a
//      request or reply has been changed to a variable-length
//      opaque byte array.  The maximum size allowed by the
//      protocol is now limited by what XDR and underlying
//      transports will allow. There are no artificial limits
//      imposed by the NFS version 3 protocol. Consult the FSINFO
//      procedure description for details.
//
//      It is possible for the server to write fewer than count
//      bytes of data. In this case, the server should not return
//      an error unless no data was written at all. If the server
//      writes less than count bytes, the client should issue
//      another WRITE to write the remaining data.
//
//      It is assumed that the act of writing data to a file will
//      cause the mtime of the file to be updated. However, the
//      mtime of the file should not be changed unless the
//      contents of the file are changed.  Thus, a WRITE request
//      with count set to 0 should not cause the mtime of the file
//      to be updated.
//
//      The NFS version 3 protocol introduces safe asynchronous
//      writes.  The combination of WRITE with stable set to
//      UNSTABLE followed by a COMMIT addresses the performance
//      bottleneck found in the NFS version 2 protocol, the need
//      to synchronously commit all writes to stable storage.
//
//      The definition of stable storage has been historically a
//      point of contention. The following expected properties of
//      stable storage may help in resolving design issues in the
//      implementation. Stable storage is persistent storage that
//      survives:
//
//      1. Repeated power failures.
//
//      2. Hardware failures (of any board, power supply, and so on.).
//
//      3. Repeated software crashes, including reboot cycle.
//
//      This definition does not address failure of the stable
//      storage module itself.
//
//      A cookie, verf, is defined to allow a client to detect
//      different instances of an NFS version 3 protocol server
//      over which cached, uncommitted data may be lost. In the
//      most likely case, the verf allows the client to detect
//      server reboots. This information is required so that the
//      client can safely determine whether the server could have
//      lost cached data. If the server fails unexpectedly and the
//      client has uncommitted data from previous WRITE requests
//      (done with the stable argument set to UNSTABLE and in
//      which the result committed was returned as UNSTABLE as
//      well) it may not have flushed cached data to stable
//      storage. The burden of recovery is on the client and the
//      client will need to retransmit the data to the server.
//
//      A suggested verf cookie would be to use the time that the
//      server was booted or the time the server was last started
//      (if restarting the server without a reboot results in lost
//      buffers).
//
//      The committed field in the results allows the client to do
//      more effective caching. If the server is committing all
//      WRITE requests to stable storage, then it should return
//      with committed set to FILE_SYNC, regardless of the value
//      of the stable field in the arguments. A server that uses
//      an NVRAM accelerator may choose to implement this policy.
//      The client can use this to increase the effectiveness of
//      the cache by discarding cached data that has already been
//      committed on the server.
//
//      Some implementations may return NFS3ERR_NOSPC instead of
//      NFS3ERR_DQUOT when a user's quota is exceeded.
//
//      Some NFS version 2 protocol server implementations
//      incorrectly returned NFSERR_ISDIR if the file system
//      object type was not a regular file. The correct return
//      value for the NFS version 3 protocol is NFS3ERR_INVAL.
//
//   ERRORS
//
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_FBIG
//      NFS3ERR_DQUOT
//      NFS3ERR_NOSPC
//      NFS3ERR_ROFS
//      NFS3ERR_INVAL
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      COMMIT.

var fs = require('fs');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var nfs_err = require('./errors');
var wcc_data = require('./wcc_data');
var NfsReply = require('./nfs_reply').NfsReply;



///--- Globals

var XDR = rpc.XDR;



///--- API

function WriteReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.count = 0;
    this.committed = 0;
    this.verf = null;

    this._nfs_write_reply = true; // MDB
}
util.inherits(WriteReply, NfsReply);
WriteReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_ACCES,
    nfs_err.NFS3ERR_FBIG,
    nfs_err.NFS3ERR_DQUOT,
    nfs_err.NFS3ERR_NOSPC,
    nfs_err.NFS3ERR_ROFS,
    nfs_err.NFS3ERR_INVAL,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


WriteReply.prototype.set_file_wcc = function set_file_wcc() {
    this.file_wcc = wcc_data.create();
    return (this.file_wcc);
};


WriteReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        this.file_wcc = wcc_data.parse(xdr);

        if (this.status === 0) {
            this.count = xdr.readInt();
            this.committed = xdr.readInt();
            this.verf = xdr.readRaw(8);
        }
    } else {
        this.push(chunk);
    }

    cb();
};


WriteReply.prototype.writeHead = function writeHead() {
    var len = 4;

    len += wcc_data.length(this.file_wcc);

    if (this.status === 0)
        len += 16;

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);
    wcc_data.serialize(xdr, this.file_wcc);

    if (this.status === 0) {
        xdr.writeInt(this.count);
        xdr.writeInt(this.committed);
        if (!this.verf) {
            this.verf = new Buffer(8);
            this.verf.fill(0);
        }
        xdr.writeRaw(this.verf);
    }

    this.write(xdr.buffer());
};


WriteReply.prototype.toString = function toString() {
    var fmt = '[object WriteReply <xid=%d, status=%d, file_wcc=%j, count=%d, ' +
        'committed=%d verf=%j>]';
    return (util.format(fmt, this.xid, this.status, this.file_wcc, this.count,
        this.committed, this.verf));
};


///--- Exports

module.exports = {
    WriteReply: WriteReply
};
