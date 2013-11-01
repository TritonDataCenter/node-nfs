// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var once = require('once');
var rpc = require('oncrpc');

var GetAttrCall = require('./get_attr_call').GetAttrCall;
var GetAttrReply = require('./get_attr_reply').GetAttrReply;
var LookupCall = require('./lookup_call').LookupCall;
var LookupReply = require('./lookup_reply').LookupReply;



///--- Helpers

function createCallback(cb) {
    cb = once(cb);

    function _callback(err, reply) {
        if (err) {
            cb(err, reply);
            return;
        }

        reply.once('error', cb);
        reply.once('end', cb.bind(null, null, reply));
        reply.resume();
    }

    return (_callback);
}



///--- API

function NfsClient(opts) {
    assert.object(opts, 'options');
    if (opts.log) {
        var l = opts.log;
        delete opts.log;
    }

    var _opts = clone(opts);
    _opts.log = opts.log = l;
    _opts.name = 'nfs';
    _opts.program = 100003;
    _opts.version = 3;

    rpc.RpcClient.call(this, _opts);
}
util.inherits(NfsClient, rpc.RpcClient);


NfsClient.prototype.getattr = function getattr(object, cb) {
    assert.string(object, 'object');
    assert.func(cb, 'callback');

    var call = new GetAttrCall({
        incoming: false,
        object: object,
        proc: 1
    });

    this._rpc(call, GetAttrReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.lookup = function lookup(what, cb) {
    assert.object(what, 'what');
    assert.func(cb, 'callback');

    var call = new LookupCall({
        incoming: false,
        what: clone(what),
        proc: 3
    });

    this._rpc(call, LookupReply, createCallback(cb));

    call.end();

    return (this);
};



///--- Exports

module.exports = {
    NfsClient: NfsClient,
    createNfsClient: function createNfsClient(opts) {
        return (new NfsClient(opts));
    }
};
