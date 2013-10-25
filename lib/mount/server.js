// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var errors = require('./errors');
var MountDumpReply = require('./dump_reply').MountDumpReply;
var MountMntCall = require('./mnt_call').MountMntCall;
var MountMntReply = require('./mnt_reply').MountMntReply;
var MountUmntCall = require('./umnt_call').MountUmntCall;
var MountUmntReply = require('./umnt_reply').MountUmntReply;



///--- Globals

var slice = Function.prototype.call.bind(Array.prototype.slice);
var RpcServer = rpc.RpcServer;



///--- API

function MountServer(opts) {
    assert.object(opts, 'options');
    if (opts.log) {
        var l = opts.log;
        delete opts.log;
    }

    var _opts = clone(opts);
    _opts.log = opts.log = l;
    _opts.name = 'mount';
    _opts.program = 100005;
    _opts.version = [1, 3];

    RpcServer.call(this, _opts);
}
util.inherits(MountServer, RpcServer);


MountServer.prototype.dump = function dump() {
    var cfg = {
        name: 'dump',
        procedure: 2,
        reply: MountDumpReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};



MountServer.prototype.mnt = function mnt() {
    var cfg = {
        name: 'mnt',
        procedure: 1,
        call: MountMntCall,
        reply: MountMntReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


MountServer.prototype.umnt = function umnt() {
    var cfg = {
        name: 'umnt',
        procedure: 3,
        call: MountUmntCall,
        reply: MountUmntReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


MountServer.prototype.start = function start(host, cb) {
    var args = slice(arguments);
    args.unshift(1892);
    this.listen.apply(this, args);
};



///--- Exports

module.exports = {
    MountServer: MountServer,
    createMountServer: function createMountServer(opts) {
        return (new MountServer(opts));
    }
};
