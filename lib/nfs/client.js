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

var AccessCall = require('./access_call').AccessCall;
var AccessReply = require('./access_reply').AccessReply;
var FsStatCall = require('./fs_stat_call').FsStatCall;
var FsStatReply = require('./fs_stat_reply').FsStatReply;
var GetAttrCall = require('./get_attr_call').GetAttrCall;
var GetAttrReply = require('./get_attr_reply').GetAttrReply;
var LookupCall = require('./lookup_call').LookupCall;
var LookupReply = require('./lookup_reply').LookupReply;
var ReadCall = require('./read_call').ReadCall;
var ReadReply = require('./read_reply').ReadReply;
var ReaddirCall = require('./readdir_call').ReaddirCall;
var ReaddirReply = require('./readdir_reply').ReaddirReply;



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


NfsClient.prototype.access = function access(object, bitmask, cb) {
    assert.string(object, 'object');
    assert.number(bitmask, 'access');
    assert.func(cb, 'callback');

    var call = new AccessCall({
        incoming: false,
        proc: 4,
        object: object,
        access: bitmask
    });

    this._rpc(call, AccessReply, createCallback(cb));

    call.end();

    return (this);
};



NfsClient.prototype.read = function read(file, offset, count, cb) {
    assert.string(file, 'object');
    assert.number(offset, 'offset');
    assert.number(count, 'count');
    assert.func(cb, 'callback');

    var call = new ReadCall({
        incoming: false,
        proc: 6,
        file: file,
        offset: offset,
        count: count
    });

    this._rpc(call, ReadReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.readdir = function readdir(opts, cb) {
    assert.object(opts, 'options');
    assert.string(opts.dir, 'options.dir');
    assert.number(opts.cookie, 'options.cookie');
    assert.number(opts.count, 'options.count');
    assert.func(cb, 'callback');

    var call = new ReaddirCall({
        incoming: false,
        proc: 16,
        dir: opts.dir,
        cookie: opts.cookie,
        count: opts.count
    });

    this._rpc(call, ReaddirReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.fsstat = function fsstat(fsroot, cb) {
    assert.string(fsroot, 'fsroot');
    assert.func(cb, 'callback');

    var call = new FsStatCall({
        incoming: false,
        proc: 18,
        fsroot: fsroot
    });

    this._rpc(call, FsStatReply, createCallback(cb));

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
