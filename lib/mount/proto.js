var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');

var RpcReply = require('../rpc').RpcReply;


///--- Globals


///--- API

function ExportsReply(opts) {
    RpcReply.call(this, opts);
}
util.inherits(ExportsReply, RpcReply);


ExportsReply.prototype.toString = function toString() {
    var fmt = '[object MountExportsReply <xid=%d>]';
    return (sprintf(fmt, this.xid));
};


///--- Exports

module.exports = {
    ExportsReply: ExportsReply
};

//
// enum mountstat3 {
//     MNT3_OK = 0,                 /* no error */
//     MNT3ERR_PERM = 1,            /* Not owner */
//     MNT3ERR_NOENT = 2,           /* No such file or directory */
//     MNT3ERR_IO = 5,              /* I/O error */
//     MNT3ERR_ACCES = 13,          /* Permission denied */
//     MNT3ERR_NOTDIR = 20,         /* Not a directory */
//     MNT3ERR_INVAL = 22,          /* Invalid argument */
//     MNT3ERR_NAMETOOLONG = 63,    /* Filename too long */
//     MNT3ERR_NOTSUPP = 10004,     /* Operation not supported */
//     MNT3ERR_SERVERFAULT = 10006  /* A failure on the server */
// };

