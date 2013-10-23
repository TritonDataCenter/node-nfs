// Copyright 2013 Joyent, Inc.  All rights reserved.
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
    NFS3ERR_Perm:        1,
    NFS3ERR_Noend:       2,
    NFS3ERR_Io:          5,
    NFS3ERR_Nxio:        6,
    NFS3ERR_Acces:       13,
    NFS3ERR_Exist:       17,
    NFS3ERR_Xdev:        18,
    NFS3ERR_Nodev:       19,
    NFS3ERR_NotDir:      20,
    NFS3ERR_IsDir:       21,
    NFS3ERR_Inval:       22,
    NFS3ERR_FBig:        27,
    NFS3ERR_NoSpace:     28,
    NFS3ERR_Rofs:        30,
    NFS3ERR_MLink:       31,
    NFS3ERR_NameTooLong: 63,
    NFS3ERR_NotEmpty:    66,
    NFS3ERR_DQuot:       69,
    NFS3ERR_Stale:       70,
    NFS3ERR_Remote:      71,
    NFS3ERR_BadHandle:   10001,
    NFS3ERR_NotSync:     10002,
    NFS3ERR_BadCookie:   10003,
    NFS3ERR_NotSupp:     10004,
    NFS3ERR_TooSmall:    10005,
    NFS3ERR_ServerFault: 10006,
    NFS3ERR_BadType:     10007,
    NFS3ERR_JukeBox:     10008
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

Object.keys(NFSSTAT3).forEach(function (k) {
    if (k === 'NFS3_OK')
        return;

    var name = 'Nfs' + k.split('_')[1] + 'Error';
    var err = function () {
        NfsError.apply(this, arguments);
        this.nfsstat3 = NFSSTAT3[k];
    };
    util.inherits(err, NfsError);
    err.prototype.name = name;

    module.exports[name] = err;
});
