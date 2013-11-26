// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');



///--- Globals

// var _MOUNTSTAT3 = {
//     MNT3_OK: 0,                 // no error
//     MNT3ERR_Perm: 1,            // Not owner
//     MNT3ERR_NoEnt: 2,           // No such file or directory
//     MNT3ERR_IO: 5,              // I/O error
//     MNT3ERR_Access: 13,         // Permission denied
//     MNT3ERR_NotDir: 20,         // Not a directory
//     MNT3ERR_Inval: 22,          // Invalid argument
//     MNT3ERR_NameTooLong: 63,    // Filename too long
//     MNT3ERR_NotSupp: 10004,     // Operation not supported
//     MNT3ERR_ServerFault: 10006  // A failure on the server
// };


var MOUNTSTAT3 = {
    MNT3_OK: 0,                 // no error
    MNT3ERR_PERM: 1,            // Not owner
    MNT3ERR_NOENT: 2,           // No such file or directory
    MNT3ERR_IO: 5,              // I/O error
    MNT3ERR_ACCES: 13,          // Permission denied
    MNT3ERR_NOTDIR: 20,         // Not a directory
    MNT3ERR_INVAL: 22,          // Invalid argument
    MNT3ERR_NAMETOOLONG: 63,    // Filename too long
    MNT3ERR_NOTSUPP: 10004,     // Operation not supported
    MNT3ERR_SERVERFAULT: 10006  // A failure on the server
};



///--- Base API

function MountError(cause, msg) {
    rpc.RpcError.apply(this, arguments);
}
MountError.prototype.name = 'MountError';
util.inherits(MountError, rpc.RpcError);


MountError.prototype.toBuffer = function toBuffer() {
    var xdr = this._serialize(4);
    xdr.writeInt(this.mountstat3);

    return (xdr.buffer());
};



///--- Exports

module.exports = {
    MountError: MountError
};

// Object.keys(MOUNTSTAT3).forEach(function (k) {
//     if (k === 'MNT3_OK')
//         return;

//     var name = 'Mount' + k.split('_')[1] + 'Error';
//     var err = function () {
//         MountError.apply(this, arguments);
//         this.mountstat3 = MOUNTSTAT3[k];
//     };
//     util.inherits(err, MountError);
//     err.prototype.name = name;

//     module.exports[name] = err;
// });

Object.keys(MOUNTSTAT3).forEach(function (k) {
    module.exports[k] = MOUNTSTAT3[k];
});
