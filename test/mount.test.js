// Copyright 2014 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var libuuid = require('node-uuid');
require('nodeunit-plus');

var nfs = require('../lib');



///--- Setup/Teardown

before(function (cb) {
    var self = this;
    var server = nfs.createMountServer({
        log: createLogger('MountTestServer')
    });

    assert.ok(server, 'server');

    server.mounts = {};

    server.on('uncaughtException', function (req, res, err) {
        console.error(err.stack);
        process.exit(1);
    });

    server.dump(function dump(req, res, next) {
        Object.keys(server.mounts).forEach(function (k) {
            res.addMapping({
                name: server.mounts[k],
                dirpath: k
            });
        });
        res.send();
        next();
    });

    server.mnt(function mount(req, res, next) {
        assert.ok(req.dirpath);
        var uuid = libuuid.v4();
        server.mounts[req.dirpath] = uuid;
        res.setFileHandle(uuid);
        res.send();
        next();
    });

    server.umnt(function unmount(req, res, next) {
        assert.ok(req.dirpath);
        assert.ok(server.mounts[req.dirpath]);
        if (server.mounts[req.dirpath])
            delete server.mounts[req.dirpath];
        res.send();
        next();
    });

    server.listen(function () {
        var addr = server.address();

        var client = nfs.createMountClient({
            log: createLogger('MountClient'),
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

test('dump', function (t) {
    this.client.dump(function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.ok(reply.mappings);
        t.equal((reply.mappings || []).length, 0);
        t.end();
    });
});


test('mount', function (t) {
    var self = this;

    this.client.mnt('/tmp', function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.ok(reply.mountinfo);
        t.ok(reply.mountinfo.fhandle);
        t.ok(reply.mountinfo.auth_flavors);
        t.deepEqual(reply.mountinfo.auth_flavors, [1]);

        self.client.dump(function (d_err, d_reply) {
            t.ifError(d_err);
            t.ok(d_reply);
            t.equal(d_reply.mappings.length, 1);
            t.equal(d_reply.mappings[0].dirpath, '/tmp');
            t.ok(d_reply.mappings[0].name);
            t.end();
        });
    });
});


test('unmount', function (t) {
    var dirpath = '/tmp';
    var self = this;

    this.client.mnt(dirpath, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.ok(reply.mountinfo);
        t.ok(reply.mountinfo.fhandle);
        t.ok(reply.mountinfo.auth_flavors);
        t.deepEqual(reply.mountinfo.auth_flavors, [1]);

        self.client.umnt(dirpath, function (u_err, u_reply) {
            t.ifError(u_err);
            t.ok(u_reply);

            self.client.dump(function (d_err, d_reply) {
                t.ifError(d_err);
                t.ok(d_reply);
                t.equal(d_reply.mappings.length, 0);
                t.end();
            });
        });
    });
});
