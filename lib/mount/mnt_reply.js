var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');

var RpcReply = require('../rpc').RpcReply;


///--- Globals

var sprintf = util.format;


///--- API

function MountdMntReply(opts) {
    RpcReply.call(this, opts);

    this.name = 'MountdMntReply';
    this.result = 0;
    this.handle = 0;
}
util.inherits(MountdMntReply, RpcReply);

/*
   const FHSIZE3    = 64;                Maximum bytes in a V3 file handle
   typedef opaque fhandle3<FHSIZE3>;

   struct mountres3_ok {
        fhandle3   fhandle;
        int        auth_flavors<>;
   };

   union mountres3 switch (mountstat3 fhs_status) {
   case MNT_OK:
        mountres3_ok  mountinfo;
   default:
        void;
   };

   enum mountstat3 {
       MNT3_OK = 0,                    no error
       MNT3ERR_PERM = 1,               Not owner
       MNT3ERR_NOENT = 2,              No such file or directory
       MNT3ERR_IO = 5,                 I/O error
       MNT3ERR_ACCES = 13,             Permission denied
       MNT3ERR_NOTDIR = 20,            Not a directory
       MNT3ERR_INVAL = 22,             Invalid argument
       MNT3ERR_NAMETOOLONG = 63,       Filename too long
       MNT3ERR_NOTSUPP = 10004,        Operation not supported
       MNT3ERR_SERVERFAULT = 10006     A failure on the server
   };
 */
MountdMntReply.prototype._flush = function _flush(cb) {
    var self = this;

    // XXX assume return ok with a dummy handle

    var len;
    if (this.result == 0) {
        // XXX return result, dummy fhandle (4 bytes) and 1 auth flavor
        len = 4 + 4 + 4 + 4 + 4;
    } else {
        // return result
        var len = 4;
    }

    var header = this._buildHeader({
        length: len
    });
    var b = header.buffer;
    var offset = header.offset;

    b.writeUInt32BE(this.result, offset);
    offset += 4;

    if (this.result == 0) {
        b.writeUInt32BE(4, offset);    // length of fhandle
        offset += 4;

        b.writeUInt32BE(this.handle, offset);
        offset += 4;

        b.writeUInt32BE(1, offset);   // number of auth flavors
        offset += 4;

        b.writeUInt32BE(1, offset);   // 1 is auth_unix
        offset += 4;
    }

    this.push(b);
    cb();
};

MountdMntReply.prototype.setMntHandle = function setMntHandle(status, handle) {
    assert.number(status);
    assert.number(handle);

    this.result = status;
    this.handle = handle;
};


MountdMntReply.prototype.toString = function toString() {
    var fmt = '[object MountdMntReply <xid=%d, res=%d, fhandle=%d>]';
    return (sprintf(fmt, this.xid, this.result, this.handle));
};


///--- Exports

module.exports = {
    MountdMntReply: MountdMntReply
};
