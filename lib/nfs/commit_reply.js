// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.21 Procedure 21: COMMIT - Commit cached data on a server to stable
//       storage
//
//   SYNOPSIS
//
//      COMMIT3res NFSPROC3_COMMIT(COMMIT3args) = 21;
//
//      struct COMMIT3args {
//           nfs_fh3    file;
//           offset3    offset;
//           count3     count;
//      };
//
//      struct COMMIT3resok {
//           wcc_data   file_wcc;
//           writeverf3 verf;
//      };
//
//      struct COMMIT3resfail {
//           wcc_data   file_wcc;
//      };
//
//      union COMMIT3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           COMMIT3resok   resok;
//      default:
//           COMMIT3resfail resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure COMMIT forces or flushes data to stable storage
//      that was previously written with a WRITE procedure call
//      with the stable field set to UNSTABLE. On entry, the
//      arguments in COMMIT3args are:
//
//      file
//         The file handle for the file to which data is to be
//         flushed (committed). This must identify a file system
//         object of type, NF3REG.
//
//      offset
//         The position within the file at which the flush is to
//         begin.  An offset of 0 means to flush data starting at
//         the beginning of the file.
//
//      count
//         The number of bytes of data to flush. If count is 0, a
//         flush from offset to the end of file is done.
//
//      On successful return, COMMIT3res.status is NFS3_OK and
//      COMMIT3res.resok contains:
//
//      file_wcc
//         Weak cache consistency data for the file. For a client
//         that requires only the post-operation file attributes,
//         these can be found in file_wcc.after.
//
//      verf
//         This is a cookie that the client can use to determine
//         whether the server has rebooted between a call to WRITE
//         and a subsequent call to COMMIT. This cookie must be
//         consistent during a single boot session and must be
//         unique between instances of the NFS version 3 protocol
//         server where uncommitted data may be lost.
//
//      Otherwise, COMMIT3res.status contains the error on failure
//      and COMMIT3res.resfail contains the following:
//
//      file_wcc
//         Weak cache consistency data for the file. For a client
//         that requires only the post-write file attributes,
//         these can be found in file_wcc.after. Even though the
//         COMMIT failed, full wcc_data is returned to allow the
//         client to determine whether the file changed on the
//         server between calls to WRITE and COMMIT.
//
//   IMPLEMENTATION
//
//      Procedure COMMIT is similar in operation and semantics to
//      the POSIX fsync(2) system call that synchronizes a file's
//      state with the disk, that is it flushes the file's data
//      and metadata to disk. COMMIT performs the same operation
//      for a client, flushing any unsynchronized data and
//      metadata on the server to the server's disk for the
//      specified file. Like fsync(2), it may be that there is
//      some modified data or no modified data to synchronize. The
//      data may have been synchronized by the server's normal
//      periodic buffer synchronization activity. COMMIT will
//      always return NFS3_OK, unless there has been an unexpected
//      error.
//
//      COMMIT differs from fsync(2) in that it is possible for
//      the client to flush a range of the file (most likely
//      triggered by a buffer-reclamation scheme on the client
//      before file has been completely written).
//
//      The server implementation of COMMIT is reasonably simple.
//      If the server receives a full file COMMIT request, that is
//      starting at offset 0 and count 0, it should do the
//      equivalent of fsync()'ing the file. Otherwise, it should
//      arrange to have the cached data in the range specified by
//      offset and count to be flushed to stable storage.  In both
//      cases, any metadata associated with the file must be
//      flushed to stable storage before returning. It is not an
//      error for there to be nothing to flush on the server.
//      This means that the data and metadata that needed to be
//      flushed have already been flushed or lost during the last
//      server failure.
//
//      The client implementation of COMMIT is a little more
//      complex.  There are two reasons for wanting to commit a
//      client buffer to stable storage. The first is that the
//      client wants to reuse a buffer. In this case, the offset
//      and count of the buffer are sent to the server in the
//      COMMIT request. The server then flushes any cached data
//      based on the offset and count, and flushes any metadata
//      associated with the file. It then returns the status of
//      the flush and the verf verifier.  The other reason for the
//      client to generate a COMMIT is for a full file flush, such
//      as may be done at close. In this case, the client would
//      gather all of the buffers for this file that contain
//      uncommitted data, do the COMMIT operation with an offset
//      of 0 and count of 0, and then free all of those buffers.
//      Any other dirty buffers would be sent to the server in the
//      normal fashion.
//
//      This implementation will require some modifications to the
//      buffer cache on the client. After a buffer is written with
//      stable UNSTABLE, it must be considered as dirty by the
//      client system until it is either flushed via a COMMIT
//      operation or written via a WRITE operation with stable set
//      to FILE_SYNC or DATA_SYNC. This is done to prevent the
//      buffer from being freed and reused before the data can be
//      flushed to stable storage on the server.
//
//      When a response comes back from either a WRITE or a COMMIT
//      operation that contains an unexpected verf, the client
//      will need to retransmit all of the buffers containing
//      uncommitted cached data to the server.  How this is to be
//      done is up to the implementor. If there is only one buffer
//      of interest, then it should probably be sent back over in
//      a WRITE request with the appropriate stable flag. If there
//      more than one, it might be worthwhile retransmitting all
//      of the buffers in WRITE requests with stable set to
//      UNSTABLE and then retransmitting the COMMIT operation to
//      flush all of the data on the server to stable storage. The
//      timing of these retransmissions is left to the
//      implementor.
//
//      The above description applies to page-cache-based systems
//      as well as buffer-cache-based systems. In those systems,
//      the virtual memory system will need to be modified instead
//      of the buffer cache.
//
//      See additional comments on WRITE on page 49.
//
//   ERRORS
//
//      NFS3ERR_IO
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      WRITE.

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

function CommitReply(opts) {
    NfsReply.call(this, opts);

    this.status = 0;
    this.verf = null;

    this._nfs_commit_reply = true; // MDB
}
util.inherits(CommitReply, NfsReply);
CommitReply.prototype._allowed_error_codes = [
    nfs_err.NFS3ERR_IO,
    nfs_err.NFS3ERR_STALE,
    nfs_err.NFS3ERR_BADHANDLE,
    nfs_err.NFS3ERR_SERVERFAULT
];


CommitReply.prototype.set_file_wcc = function set_file_wcc() {
    this.file_wcc = wcc_data.create();
    return (this.file_wcc);
};


CommitReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.status = xdr.readInt();
        this.file_wcc = wcc_data.parse(xdr);

        if (this.status === 0)
            this.verf = xdr.readRaw(8);
    } else {
        this.push(chunk);
    }

    cb();
};


CommitReply.prototype.writeHead = function writeHead() {
    var len = 4;

    len += wcc_data.length(this.file_wcc);
    if (this.status === 0)
        len += 8;

    var xdr = this._serialize(len);

    xdr.writeInt(this.status);
    wcc_data.serialize(xdr, this.file_wcc);

    if (this.status === 0) {
        if (!this.verf) {
            this.verf = new Buffer(8);
            this.verf.fill(0);
        }
        xdr.writeRaw(this.verf);
    }

    this.write(xdr.buffer());
};


CommitReply.prototype.toString = function toString() {
    var fmt = '[object CommitReply <xid=%d, status=%d, file_wcc=%j, verf=%j>]';
    return (util.format(fmt, this.xid, this.status, this.file_wcc, this.verf));
};


///--- Exports

module.exports = {
    CommitReply: CommitReply
};
