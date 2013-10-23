// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var fs = require('fs');
var path = require('path');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var libuuid = require('libuuid');
var nfs = require('../lib');
var rpc = require('oncrpc');
var statvfs = require('statvfs');



///--- Globals

var MOUNTS = {};



////--- Private Functions

function authorize(req, res, next) {
    if (!req.user_allowed([0])) {
        next(new nfs.MountAccessError('uid 0 required'));
    } else {
        next();
    }
}


function check_dirpath(req, res, next) {
    assert.string(req.dirpath, 'req.dirpath');

    var p = path.normalize(req.dirpath);
    req._dirpath = p;
    if (p.length > 64) {
        next(new nfs.MountNameTooLongError(p + ' > 64 bytes'));
    }

    fs.stat(p, function (err, stats) {
        if (err) {
            if (err.code === 'ENOENT') {
                next(new nfs.MountNoEntError(err));
            } else if (err.code === 'EACCES') {
                req.log.warn({
                    err: err,
                    path: p
                }, 'unable to read directory');
                next(new nfs.MountAccessError(err));
            } else {
                next(new nfs.MountIOError(err, 'internal error'));
            }
        } else if (!stats.isDirectory()) {
            next(new nfs.MountNotDirError());
        } else {
            next();
        }
    });
}


function mount(req, res, next) {
    var uuid = libuuid.create();
    MOUNTS[uuid] = req._dirpath;
    res.setFileHandle(uuid);
    res.send();
    next();
}


function check_mount_table(req, res, next) {
    if (!MOUNTS[req.object]) {
        next(new nfs.NfsBadHandleError(req.object));
    } else {
        next();
    }
}


function get_attr(req, res, next) {
    var f = MOUNTS[req.object]
    fs.lstat(f, function (err, stats) {
        if (err) {
            next(new nfs.NfsStaleError(err, f));
        } else {
            res.setAttributes(stats);
            res.send();
            next();
        }
    });
}


function fs_set_attrs(req, res, next) {
    var f = MOUNTS[req.fsroot];
    fs.lstat(f, function (err, stats) {
        if (err) {
            next(new nfs.NfsStaleError(err, f));
        } else {
            req._stats = stats;
            res.setAttributes(stats);
            next();
        }
    });
}

function fs_info(req, res, next) {
    var stats = req._stats;
    // Stolen from: http://goo.gl/fBLulQ (IBM)
    res.wtmax = res.rtmax = 65536;
    res.wtpref = res.rtpref = 32768;
    res.wtmult = res.rtmult = 4096;
    res.dtpref = 8192;

    // Our made up vals
    res.maxfilesize = 1099511627776; // 1T
    res.time_delta = {
        seconds: 0,
        nseconds: 1000000
    }; // milliseconds
    res.properties = nfs.FSF3_LINK | nfs.FSF3_SYMLINK;
    res.send();
    next();
}



function fs_stat(req, res, next) {
    var f = MOUNTS[req.fsroot];
    statvfs(f, function (err, stats) {
        if (err) {
            next(new nfs.NfsStaleError(err, f));
        } else {
            res.tbytes = stats.blocks * stats.bsize;
            res.fbytes = stats.bfree * stats.bsize;
            res.abytes = stats.bavail * stats.bsize;
            res.tfiles = stats.files;
            res.ffiles = stats.ffree;
            res.afiles = stats.favail;
            res.invarsec = 0;
            res.send();
            next();
        }
    });
}




///--- Mainline

(function main() {
    function logger(name) {
        return (bunyan.createLogger({
            name: name,
            level: 'trace', //process.env.LOG_LEVEL || 'info',
            src: true,
            stream: process.stdout,
            serializers: rpc.serializers
        }));
        return (l);
    }


    var portmapd = rpc.createPortmapServer({
        log: logger('portmapd')
    });

    var mountd = nfs.createMountServer({
        log: logger('mountd')
    });

    var nfsd = nfs.createNfsServer({
        log: logger('nfsd')
    });

    portmapd.getPort(function get_port(req, res, next) {
        if (req.mapping.prog === 100003) {
            res.port = 2049;
        } else if (req.mapping.prog === 100005) {
            res.port = 1892;
        }

        res.send();
        next();
    });

    mountd.mnt(authorize, check_dirpath, mount);

    nfsd.get_attr(authorize, check_mount_table, get_attr);
    nfsd.fs_info(authorize, check_mount_table, fs_set_attrs, fs_info);
    nfsd.fs_stat(authorize, check_mount_table, fs_set_attrs, fs_stat);

    var log = logger('audit');
    function after(name, req, res) {
        log.info({
            rpc_call: req,
            rpc_reply: res
        }, '%s: handled', name);
    }
    portmapd.on('after', after);
    mountd.on('after', after);
    nfsd.on('after', after);

    nfsd.on('uncaughtException', function (req, res, err) {
        console.error('ERROR: %s', err.stack);
        process.exit(1);
    });

    mountd.on('uncaughtException', function (req, res, err) {
        console.error('ERROR: %s', err.stack);
        process.exit(1);
    });

    portmapd.start(function () {
        mountd.start(function () {
            nfsd.start(function () {
                console.log('ready');
            });
        });
    })
})();
