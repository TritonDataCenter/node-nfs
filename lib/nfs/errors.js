// Copyright 2014 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');



///--- Globals

var NFSSTAT3 = {
    NFS3_OK:             0,
    NFS3ERR_PERM:        1,
    NFS3ERR_NOENT:       2,
    NFS3ERR_IO:          5,
    NFS3ERR_NXIO:        6,
    NFS3ERR_ACCES:       13,
    NFS3ERR_EXIST:       17,
    NFS3ERR_XDEV:        18,
    NFS3ERR_NODEV:       19,
    NFS3ERR_NOTDIR:      20,
    NFS3ERR_ISDIR:       21,
    NFS3ERR_INVAL:       22,
    NFS3ERR_FBIG:        27,
    NFS3ERR_NOSPACE:     28,
    NFS3ERR_ROFS:        30,
    NFS3ERR_MLINK:       31,
    NFS3ERR_NAMETOOLONG: 63,
    NFS3ERR_NOTEMPTY:    66,
    NFS3ERR_DQUOT:       69,
    NFS3ERR_STALE:       70,
    NFS3ERR_REMOTE:      71,
    NFS3ERR_BADHANDLE:   10001,
    NFS3ERR_NOT_SYNC:    10002,
    NFS3ERR_BAD_COOKIE:  10003,
    NFS3ERR_NOTSUPP:     10004,
    NFS3ERR_TOOSMALL:    10005,
    NFS3ERR_SERVERFAULT: 10006,
    NFS3ERR_BADTYPE:     10007,
    NFS3ERR_JUKEBOX:     10008
};



///--- Base API

function NfsError(cause, msg) {
    rpc.RpcError.apply(this, arguments);
}
NfsError.prototype.name = 'NfsError';
util.inherits(NfsError, rpc.RpcError);


NfsError.prototype.toBuffer = function toBuffer() {
    var xdr = this._serialize(4);
    xdr.writeInt(this.nfsstat3);

    return (xdr.buffer());
};



///--- Exports

module.exports = {
    NfsError: NfsError
};

// Object.keys(_NFSSTAT3).forEach(function (k) {
//     if (k === 'NFS3_OK')
//         return;

//     var name = 'Nfs' + k.split('_')[1] + 'Error';
//     var err = function () {
//         NfsError.apply(this, arguments);
//         this.nfsstat3 = NFSSTAT3[k];
//     };
//     util.inherits(err, NfsError);
//     err.prototype.name = name;

//     module.exports[name] = err;
// });


Object.keys(NFSSTAT3).forEach(function (k) {
    module.exports[k] = NFSSTAT3[k];
});
