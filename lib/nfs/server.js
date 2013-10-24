// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');

var AccessCall = require('./access_call').AccessCall;
var AccessReply = require('./access_reply').AccessReply;
var FsInfoCall = require('./fs_info_call').FsInfoCall;
var FsInfoReply = require('./fs_info_reply').FsInfoReply;
var FsStatCall = require('./fs_stat_call').FsStatCall;
var FsStatReply = require('./fs_stat_reply').FsStatReply;
var GetAttrCall = require('./get_attr_call').GetAttrCall;
var GetAttrReply = require('./get_attr_reply').GetAttrReply;
var LookupCall = require('./lookup_call').LookupCall;
var LookupReply = require('./lookup_reply').LookupReply;
var PathConfCall = require('./path_conf_call').PathConfCall;
var PathConfReply = require('./path_conf_reply').PathConfReply;



///--- Globals

var slice = Function.prototype.call.bind(Array.prototype.slice);
var RpcServer = rpc.RpcServer;



///--- API

function NfsServer(opts) {
    assert.object(opts, 'options');
    if (opts.log) {
        var l = opts.log;
        delete opts.log;
    }

    var _opts = clone(opts);
    _opts.log = opts.log = l;
    _opts.name = 'nfsd';
    _opts.program = 100003;
    _opts.version = 3;

    RpcServer.call(this, _opts);
}
util.inherits(NfsServer, RpcServer);


NfsServer.prototype.access = function access() {
    var cfg = {
        name: 'access',
        procedure: 4,
        call: AccessCall,
        reply: AccessReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.fs_info = function fs_info() {
    var cfg = {
        name: 'fs_info',
        procedure: 19,
        call: FsInfoCall,
        reply: FsInfoReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.fs_stat = function fs_stat() {
    var cfg = {
        name: 'fs_stat',
        procedure: 18,
        call: FsStatCall,
        reply: FsStatReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.get_attr = function get_attr() {
    var cfg = {
        name: 'get_attr',
        procedure: 1,
        call: GetAttrCall,
        reply: GetAttrReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.lookup = function lookup() {
    var cfg = {
        name: 'lookup',
        procedure: 3,
        call: LookupCall,
        reply: LookupReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.path_conf = function path_conf() {
    var cfg = {
        name: 'path_conf',
        procedure: 20,
        call: PathConfCall,
        reply: PathConfReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.start = function start(host, cb) {
    var args = slice(arguments);
    args.unshift(2049);
    this.listen.apply(this, args);
};



///--- Exports

module.exports = {
    NfsServer: NfsServer,
    createNfsServer: function createNfsServer(opts) {
        return (new NfsServer(opts));
    }
};
