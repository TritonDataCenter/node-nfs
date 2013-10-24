// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var RpcCall = require('oncrpc').RpcCall;



///--- API

function NfsCall(opts) {
    assert.object(opts, 'options');

    RpcCall.call(this, opts);

    this._nfs_call = true; // MDB
}
util.inherits(NfsCall, RpcCall);
Object.defineProperty(NfsCall.prototype, 'object', {
    get: function object() {
        throw new Error('get: object must be defined');
    }
});



///--- Exports

module.exports = {
    NfsCall: NfsCall
};
