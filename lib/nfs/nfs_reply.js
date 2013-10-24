// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var RpcReply = require('oncrpc').RpcReply;



///--- API

function NfsReply(opts) {
    assert.object(opts, 'options');

    RpcReply.call(this, opts);

    this._nfs_reply = true; // MDB
}
util.inherits(NfsReply, RpcReply);


NfsReply.prototype.error = function error(status) {
    assert.number(status, 'status');

    if (!Array.isArray(this._allowed_error_codes))
        throw new Error('this._allowed_error_codes must be defined');

    if (!this._allowed_error_codes.some(function (c) {
        return (c === status);
    })) {
        throw new Error(status + ' is not an allowed status code');
    }

    this.status = status;
    this.send();
};



///--- Exports

module.exports = {
    NfsReply: NfsReply
};
