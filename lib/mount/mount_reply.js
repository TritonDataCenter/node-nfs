// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var RpcReply = require('oncrpc').RpcReply;

var mnt_err = require('./errors');



///--- Errors

var ALLOWED_ERRORS = [
    mnt_err.MNT3ERR_NOENT,
    mnt_err.MNT3ERR_IO,
    mnt_err.MNT3ERR_ACCES,
    mnt_err.MNT3ERR_NOTDIR,
    mnt_err.MNT3ERR_NAMETOOLONG,
    mnt_err.MNT3ERR_SERVERFAULT
];

///--- API

function MountReply(opts) {
    assert.object(opts, 'options');

    RpcReply.call(this, opts);

    this._mount_reply = true; // MDB
}
util.inherits(MountReply, RpcReply);


MountReply.prototype.error = function error(status) {
    assert.number(status, 'status');

    if (!ALLOWED_ERRORS.some(function (c) {
        return (c === status);
    })) {
        throw new Error(status + ' is not an allowed status code');
    }

    this.status = status;
    this.send();
};



///--- Exports

module.exports = {
    MountReply: MountReply
};
