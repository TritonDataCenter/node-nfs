// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.6 Procedure 6: READ - Read From file
//
//    SYNOPSIS
//
//       READ3res NFSPROC3_READ(READ3args) = 6;
//
//       struct READ3args {
//            nfs_fh3  file;
//            offset3  offset;
//            count3   count;
//       };
//
//       struct READ3resok {
//            post_op_attr   file_attributes;
//            count3         count;
//            bool           eof;
//            opaque         data<>;
//       };
//
//       struct READ3resfail {
//            post_op_attr   file_attributes;
//       };
//
//       union READ3res switch (nfsstat3 status) {
//       case NFS3_OK:
//            READ3resok   resok;
//       default:
//            READ3resfail resfail;
//       };
//
//    DESCRIPTION
//
//       Procedure READ reads data from a file.  On entry, the
//       arguments in READ3args are:
//
//       file
//          The file handle of the file from which data is to be
//          read.  This must identify a file system object of type,
//          NF3REG.
//
//       offset
//          The position within the file at which the read is to
//          begin.  An offset of 0 means to read data starting at
//          the beginning of the file. If offset is greater than or
//          equal to the size of the file, the status, NFS3_OK, is
//          returned with count set to 0 and eof set to TRUE,
//          subject to access permissions checking.
//
//       count
//          The number of bytes of data that are to be read. If
//          count is 0, the READ will succeed and return 0 bytes of
//          data, subject to access permissions checking. count
//          must be less than or equal to the value of the rtmax
//          field in the FSINFO reply structure for the file system
//          that contains file. If greater, the server may return
//          only rtmax bytes, resulting in a short read.
//
//       On successful return, READ3res.status is NFS3_OK and
//       READ3res.resok contains:
//
//       file_attributes
//          The attributes of the file on completion of the read.
//
//       count
//          The number of bytes of data returned by the read.
//
//       eof
//          If the read ended at the end-of-file (formally, in a
//          correctly formed READ request, if READ3args.offset plus
//          READ3resok.count is equal to the size of the file), eof
//          is returned as TRUE; otherwise it is FALSE. A
//          successful READ of an empty file will always return eof
//          as TRUE.
//
//       data
//          The counted data read from the file.
//
//       Otherwise, READ3res.status contains the error on failure
//       and READ3res.resfail contains the following:
//
//       file_attributes
//          The post-operation attributes of the file.
//
//    IMPLEMENTATION
//
//       The nfsdata type used for the READ and WRITE operations in
//       the NFS version 2 protocol defining the data portion of a
//       request or reply has been changed to a variable-length
//       opaque byte array.  The maximum size allowed by the
//       protocol is now limited by what XDR and underlying
//       transports will allow. There are no artificial limits
//       imposed by the NFS version 3 protocol. Consult the FSINFO
//       procedure description for details.
//
//       It is possible for the server to return fewer than count
//       bytes of data. If the server returns less than the count
//       requested and eof set to FALSE, the client should issue
//       another READ to get the remaining data. A server may
//       return less data than requested under several
//       circumstances. The file may have been truncated by another
//       client or perhaps on the server itself, changing the file
//       size from what the requesting client believes to be the
//       case. This would reduce the actual amount of data
//       available to the client. It is possible that the server
//       may back off the transfer size and reduce the read request
//       return. Server resource exhaustion may also occur
//       necessitating a smaller read return.
//
//       Some NFS version 2 protocol client implementations chose
//       to interpret a short read response as indicating EOF. The
//       addition of the eof flag in the NFS version 3 protocol
//       provides a correct way of handling EOF.
//
//       Some NFS version 2 protocol server implementations
//       incorrectly returned NFSERR_ISDIR if the file system
//       object type was not a regular file. The correct return
//       value for the NFS version 3 protocol is NFS3ERR_INVAL.
//
//    ERRORS
//
//       NFS3ERR_IO
//       NFS3ERR_NXIO
//       NFS3ERR_ACCES
//       NFS3ERR_INVAL
//       NFS3ERR_STALE
//       NFS3ERR_BADHANDLE
//       NFS3ERR_SERVERFAULT
//
//    SEE ALSO
//
//       READLINK.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;



///--- API

function ReadCall(opts) {
    assert.object(opts, 'options');
    assert.optionalString(opts.file, 'options.file');
    assert.optionalNumber(opts.offset, 'options.offset');
    assert.optionalNumber(opts.count, 'options.count');

    NfsCall.call(this, opts, true);

    this.file = opts.file || '';
    this.offset = opts.offset || 0;
    this.count = opts.count || 0;

    this._nfs_read_call = true; // MDB
}
util.inherits(ReadCall, NfsCall);
Object.defineProperty(ReadCall.prototype, 'object', {
    get: function object() {
        return (this.file);
    }
});


ReadCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.file = xdr.readString();
        this.offset = xdr.readHyper();
        this.count = xdr.readInt();
    } else {
        this.push(chunk);
    }

    cb();
};


ReadCall.prototype.writeHead = function writeHead() {
    var xdr = this._serialize(12 + XDR.byteLength(this.file));
    xdr.writeString(this.file);
    xdr.writeHyper(this.offset);
    xdr.writeInt(this.count);

    this.write(xdr.buffer());
};


ReadCall.prototype.toString = function toString() {
    var fmt = '[object ReadCall <xid=%d, file=%s, offset=%d, count=%d>]';
    return (util.format(fmt, this.xid, this.file, this.offset, this.count));
};



///--- Exports

module.exports = {
    ReadCall: ReadCall
};
