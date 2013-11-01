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

var MountDumpReply = require('./dump_reply').MountDumpReply;
var MountMntCall = require('./mnt_call').MountMntCall;
var MountMntReply = require('./mnt_reply').MountMntReply;
var MountUmntCall = require('./umnt_call').MountUmntCall;
var MountUmntReply = require('./umnt_reply').MountUmntReply;



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

function MountClient(opts) {
    assert.object(opts, 'options');
    if (opts.log) {
        var l = opts.log;
        delete opts.log;
    }

    var _opts = clone(opts);
    _opts.log = opts.log = l;
    _opts.name = 'mount';
    _opts.program = 100005;
    _opts.version = 3;

    rpc.RpcClient.call(this, _opts);
}
util.inherits(MountClient, rpc.RpcClient);


MountClient.prototype.dump = function dump(cb) {
    assert.func(cb, 'callback');

    var call = new rpc.RpcCall({
        incoming: false,
        proc: 2
    });

    this._rpc(call, MountDumpReply, createCallback(cb));

    call.end();

    return (this);
};


MountClient.prototype.mnt = function mnt(dirpath, cb) {
    assert.string(dirpath, 'dirpath');
    assert.func(cb, 'callback');

    var call = new MountMntCall({
        dirpath: dirpath,
        incoming: false,
        proc: 1
    });

    this._rpc(call, MountMntReply, createCallback(cb));

    call.end();

    return (this);
};


MountClient.prototype.umnt = function umnt(dirpath, cb) {
    assert.string(dirpath, 'dirpath');
    assert.func(cb, 'callback');

    cb = once(cb);

    var call = new MountUmntCall({
        dirpath: dirpath,
        incoming: false,
        proc: 3
    });

    this._rpc(call, MountUmntReply, createCallback(cb));

    call.end();


    return (this);
};



///--- Exports

module.exports = {
    MountClient: MountClient,
    createMountClient: function createMountClient(opts) {
        return (new MountClient(opts));
    }
};
