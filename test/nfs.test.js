// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var libuuid = require('libuuid');
require('nodeunit-plus');

var nfs = require('../lib');



///--- Setup/Teardown

before(function (cb) {
    var self = this;

    // This is hacked up and doesn't act like a real NFS server -
    // here we're always assuming fhandle is actually the file
    // name
    var server = nfs.createNfsServer({
        log: createLogger('NfsTestServer')
    });

    assert.ok(server, 'server');

    server.on('uncaughtException', function (req, res, err) {
        console.error(err.stack);
        process.exit(1);
    });

    server.getattr(function (req, res, next) {
        fs.lstat(req.object, function (err, stats) {
            if (err) {
                req.log.warn(err, 'getattr: lstat failed');
                res.error(nfs.NFS3ERR_IO);
                next(false);
            } else {
                res.setAttributes(stats);
                res.send();
                next();
            }
        });
    });

    server.lookup(function lookup(req, res, next) {
        var f = path.resolve(req.what.dir, req.what.name);
        fs.lstat(f, function (f_err, f_stats) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
            } else {
                res.object = f;
                res.setAttributes(f_stats);
                fs.lstat(req.what.dir, function (d_err, d_stats) {
                    if (d_err) {
                        nfs.handle_error(d_err, req, res, next);
                    } else {
                        res.setDirAttributes(d_stats);
                        res.send();
                        next();
                    }
                });
            }
        });
    });

    server.listen(function () {
        var addr = server.address();

        var client = nfs.createNfsClient({
            log: createLogger('NfsClient'),
            url: util.format('tcp://%s:%d', addr.address, addr.port)
        });

        assert.ok(client, 'client');

        client.once('connect', function () {
            self.client = client;
            self.server = server;
            cb();
        });
    });
});


after(function (cb) {
    var self = this;
    this.client.close(function () {
        self.server.close(cb);
    });
});



///--- Tests

test('getattr', function (t) {
    this.client.getattr('/tmp', function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.obj_attributes);
        t.end();
    });
});


test('lookup', function (t) {
    var what = {
        dir: '/',
        name: 'tmp'
    };
    this.client.lookup(what, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.equal(reply.object, '/tmp');
        t.ok(reply.obj_attributes);
        t.ok(reply.dir_attributes);
        t.end();
    });
});
