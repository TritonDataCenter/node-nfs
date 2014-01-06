// Copyright 2014 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var fs = require('fs');
var path = require('path');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var libuuid = require('node-uuid');
var nfs = require('../lib');
var rpc = require('oncrpc');



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
            res.setFileHandle(libuuid.v4());
            res.writeHead();
            res.end();
            next();
        }
    });
}



///--- Mainline

(function main() {
    var log = bunyan.createLogger({
        name: 'mountd',
        level: 'info',
        src: true,
        stream: process.stdout,
        serializers: rpc.serializers
    });

    var server = nfs.createMountServer({
        log: log
    });

    server.mnt(authorize, check_dirpath);

    server.on('after', function (name, req, res, err) {
        log.info({
            rpc_call: req,
            rpc_reply: res,
            err: err
        }, '%s: handled', name);
    });

    server.on('uncaughtException', function (req, res, err) {
        console.error('ERROR: %s', err.stack);
        process.exit(1);
    });

    server.start(function () {
        console.log('ready');
    });
})();
