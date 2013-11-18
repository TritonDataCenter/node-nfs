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
var CreateCall = require('./create_call').CreateCall;
var CreateReply = require('./create_reply').CreateReply;
var CommitCall = require('./commit_call').CommitCall;
var CommitReply = require('./commit_reply').CommitReply;
var FsInfoCall = require('./fs_info_call').FsInfoCall;
var FsInfoReply = require('./fs_info_reply').FsInfoReply;
var FsStatCall = require('./fs_stat_call').FsStatCall;
var FsStatReply = require('./fs_stat_reply').FsStatReply;
var GetAttrCall = require('./get_attr_call').GetAttrCall;
var GetAttrReply = require('./get_attr_reply').GetAttrReply;
var LinkCall = require('./link_call').LinkCall;
var LinkReply = require('./link_reply').LinkReply;
var LookupCall = require('./lookup_call').LookupCall;
var LookupReply = require('./lookup_reply').LookupReply;
var MkdirCall = require('./mkdir_call').MkdirCall;
var MkdirReply = require('./mkdir_reply').MkdirReply;
var MknodCall = require('./mknod_call').MknodCall;
var MknodReply = require('./mknod_reply').MknodReply;
var PathConfCall = require('./path_conf_call').PathConfCall;
var PathConfReply = require('./path_conf_reply').PathConfReply;
var ReadCall = require('./read_call').ReadCall;
var ReadReply = require('./read_reply').ReadReply;
var ReaddirCall = require('./readdir_call').ReaddirCall;
var ReaddirReply = require('./readdir_reply').ReaddirReply;
var ReaddirplusCall = require('./readdirplus_call').ReaddirplusCall;
var ReaddirplusReply = require('./readdirplus_reply').ReaddirplusReply;
var ReadlinkCall = require('./readlink_call').ReadlinkCall;
var ReadlinkReply = require('./readlink_reply').ReadlinkReply;
var RemoveCall = require('./remove_call').RemoveCall;
var RemoveReply = require('./remove_reply').RemoveReply;
var RenameCall = require('./rename_call').RenameCall;
var RenameReply = require('./rename_reply').RenameReply;
var RmdirCall = require('./rmdir_call').RmdirCall;
var RmdirReply = require('./rmdir_reply').RmdirReply;
var SetAttrCall = require('./set_attr_call').SetAttrCall;
var SetAttrReply = require('./set_attr_reply').SetAttrReply;
var SymlinkCall = require('./symlink_call').SymlinkCall;
var SymlinkReply = require('./symlink_reply').SymlinkReply;
var WriteCall = require('./write_call').WriteCall;
var WriteReply = require('./write_reply').WriteReply;



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

NfsServer.prototype.getattr = function getattr() {
    var cfg = {
        name: 'getattr',
        procedure: 1,
        call: GetAttrCall,
        reply: GetAttrReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.setattr = function setattr() {
    var cfg = {
        name: 'setattr',
        procedure: 2,
        call: SetAttrCall,
        reply: SetAttrReply
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


NfsServer.prototype.readlink = function readlink() {
    var cfg = {
        name: 'readlink',
        procedure: 5,
        call: ReadlinkCall,
        reply: ReadlinkReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.read = function read() {
    var cfg = {
        name: 'read',
        procedure: 6,
        call: ReadCall,
        reply: ReadReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.write = function write() {
    var cfg = {
        name: 'write',
        procedure: 7,
        call: WriteCall,
        reply: WriteReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.create = function create() {
    var cfg = {
        name: 'create',
        procedure: 8,
        call: CreateCall,
        reply: CreateReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.mkdir = function mkdir() {
    var cfg = {
        name: 'mkdir',
        procedure: 9,
        call: MkdirCall,
        reply: MkdirReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.symlink = function symlink() {
    var cfg = {
        name: 'symlink',
        procedure: 10,
        call: SymlinkCall,
        reply: SymlinkReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.mknod = function mknod() {
    var cfg = {
        name: 'mknod',
        procedure: 11,
        call: MknodCall,
        reply: MknodReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.remove = function remove() {
    var cfg = {
        name: 'remove',
        procedure: 12,
        call: RemoveCall,
        reply: RemoveReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.rmdir = function rmdir() {
    var cfg = {
        name: 'rmdir',
        procedure: 13,
        call: RmdirCall,
        reply: RmdirReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.rename = function rename() {
    var cfg = {
        name: 'rename',
        procedure: 14,
        call: RenameCall,
        reply: RenameReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.link = function link() {
    var cfg = {
        name: 'link',
        procedure: 15,
        call: LinkCall,
        reply: LinkReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.readdir = function readdir() {
    var cfg = {
        name: 'readdir',
        procedure: 16,
        call: ReaddirCall,
        reply: ReaddirReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.readdirplus = function readdirplus() {
    var cfg = {
        name: 'readdirplus',
        procedure: 17,
        call: ReaddirplusCall,
        reply: ReaddirplusReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.fsstat = function fsstat() {
    var cfg = {
        name: 'fsstat',
        procedure: 18,
        call: FsStatCall,
        reply: FsStatReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.fsinfo = function fsinfo() {
    var cfg = {
        name: 'fsinfo',
        procedure: 19,
        call: FsInfoCall,
        reply: FsInfoReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.pathconf = function pathconf() {
    var cfg = {
        name: 'pathconf',
        procedure: 20,
        call: PathConfCall,
        reply: PathConfReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


NfsServer.prototype.commit = function commit() {
    var cfg = {
        name: 'commit',
        procedure: 21,
        call: CommitCall,
        reply: CommitReply
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
