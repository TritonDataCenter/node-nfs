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


NfsClient.prototype.setattr = function setattr(object, new_attrs, guard, cb) {
    assert.string(object, 'object');
    assert.optionalObject(new_attrs, 'new_attrs');
    assert.optionalObject(guard, 'guard');
    assert.func(cb, 'callback');

    var call = new SetAttrCall({
        incoming: false,
        object: object,
        new_attributes: new_attrs,
        guard: guard,
        proc: 2
    });

    this._rpc(call, SetAttrReply, createCallback(cb));

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


NfsClient.prototype.readlink = function readlink(slink, cb) {
    assert.string(slink, 'slink');
    assert.func(cb, 'callback');

    var call = new ReadlinkCall({
        incoming: false,
        proc: 5,
        symlink: slink
    });

    this._rpc(call, ReadlinkReply, createCallback(cb));

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


NfsClient.prototype.write = function write(file, offset, count, stable, data,
  cb) {
    assert.string(file, 'object');
    assert.number(offset, 'offset');
    assert.number(count, 'count');
    assert.number(stable, 'stable');
    assert.string(data, 'data');
    assert.func(cb, 'callback');

    var b = new Buffer(data);

    var call = new WriteCall({
        incoming: false,
        proc: 7,
        file: file,
        offset: offset,
        count: count,
        stable: stable,
        data: b
    });

    this._rpc(call, WriteReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.create = function create(where, how, attrs, cb) {
    assert.object(where, 'where');
    assert.number(how, 'how');
    assert.object(attrs, 'attrs');
    assert.func(cb, 'callback');

    var call = new CreateCall({
        incoming: false,
        proc: 8,
        where: clone(where),
        how: how,
        attributes: clone(attrs)
    });

    this._rpc(call, CreateReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.mkdir = function mkdir(where, attrs, cb) {
    assert.object(where, 'where');
    assert.object(attrs, 'attrs');
    assert.func(cb, 'callback');

    var call = new MkdirCall({
        incoming: false,
        proc: 9,
        where: clone(where),
        attributes: clone(attrs)
    });

    this._rpc(call, MkdirReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.symlink = function symlink(where, data, attrs, cb) {
    assert.object(where, 'where');
    assert.string(data, 'data');
    assert.object(attrs, 'attrs');
    assert.func(cb, 'callback');

    var call = new SymlinkCall({
        incoming: false,
        proc: 10,
        where: clone(where),
        symlink_attributes: clone(attrs),
        symlink_data: clone(data)
    });

    this._rpc(call, SymlinkReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.mknod = function mknod(where, type, cb) {
    assert.object(where, 'where');
    assert.number(type, 'type');
    assert.func(cb, 'callback');

    var call = new MknodCall({
        incoming: false,
        proc: 11,
        where: clone(where),
        type: type
    });

    this._rpc(call, MknodReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.remove = function remove(object, cb) {
    assert.object(object, 'object');
    assert.func(cb, 'callback');

    var call = new RemoveCall({
        incoming: false,
        proc: 12,
        object: clone(object)
    });

    this._rpc(call, RemoveReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.rmdir = function rmdir(object, cb) {
    assert.object(object, 'object');
    assert.func(cb, 'callback');

    var call = new RmdirCall({
        incoming: false,
        proc: 13,
        object: clone(object)
    });

    this._rpc(call, RmdirReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.rename = function rename(from, to, cb) {
    assert.object(from, 'from');
    assert.object(to, 'to');
    assert.func(cb, 'callback');

    var call = new RenameCall({
        incoming: false,
        proc: 14,
        from: clone(from),
        to: clone(to)
    });

    this._rpc(call, RenameReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.link = function link(file, lnk, cb) {
    assert.string(file, 'object');
    assert.object(lnk, 'lnk');
    assert.func(cb, 'callback');

    var call = new LinkCall({
        incoming: false,
        proc: 15,
        file: clone(file),
        link: clone(lnk)
    });

    this._rpc(call, LinkReply, createCallback(cb));

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


NfsClient.prototype.readdirplus = function readdirplus(opts, cb) {
    assert.object(opts, 'options');
    assert.string(opts.dir, 'options.dir');
    assert.number(opts.cookie, 'options.cookie');
    assert.number(opts.dircount, 'options.dircount');
    assert.func(cb, 'callback');

    var call = new ReaddirplusCall({
        incoming: false,
        proc: 17,
        dir: opts.dir,
        cookie: opts.cookie,
        dircount: opts.dircount,
        maxcount: opts.maxcount
    });

    this._rpc(call, ReaddirplusReply, createCallback(cb));

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


NfsClient.prototype.fsinfo = function fsinfo(fsroot, cb) {
    assert.string(fsroot, 'fsroot');
    assert.func(cb, 'callback');

    var call = new FsInfoCall({
        incoming: false,
        proc: 19,
        fsroot: fsroot
    });

    this._rpc(call, FsInfoReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.pathconf = function pathconf(file, cb) {
    assert.string(file, 'file');
    assert.func(cb, 'callback');

    var call = new PathConfCall({
        incoming: false,
        proc: 20,
        _object: file
    });

    this._rpc(call, PathConfReply, createCallback(cb));

    call.end();

    return (this);
};


NfsClient.prototype.commit = function commit(file, offset, count, cb) {
    assert.string(file, 'file');
    assert.number(offset, 'offset');
    assert.number(count, 'count');
    assert.func(cb, 'callback');

    var call = new CommitCall({
        incoming: false,
        proc: 21,
        file: file,
        offset: offset,
        count: count
    });

    this._rpc(call, CommitReply, createCallback(cb));

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
