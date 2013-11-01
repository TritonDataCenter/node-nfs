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

    server.lookup(function (req, res, next) {
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

    server.access(function (req, res, next) {
        fs.lstat(req.object, function (f_err, f_stats) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
            } else {
                res.setAttributes(f_stats);
                res.access =
                    nfs.ACCESS3_READ    |
                    nfs.ACCESS3_LOOKUP  |
                    nfs.ACCESS3_MODIFY  |
                    nfs.ACCESS3_EXTEND  |
                    nfs.ACCESS3_DELETE  |
                    nfs.ACCESS3_EXECUTE;
                res.send();
                next();
            }
        });
    });

    server.read(function (req, res, next) {
        fs.open(req.file, 'r', function (o_err, fd) {
            if (o_err) {
                nfs.handle_error(o_err, req, res, next);
                return;
            }

            var buf = new Buffer(req.count);
            var len = buf.length;
            var off = req.offset;

            fs.read(fd, buf, 0, len, off, function (r_err, nbytes) {
                fs.close(fd, function (c_err) {
                    if (c_err) {
                        nfs.handle_error(c_err, req, res, next);
                        return;
                    } else if (r_err) {
                        nfs.handle_error(c_err, req, res, next);
                        return;
                    }

                    res.count = Math.min(len, nbytes);
                    res.data = buf.slice(0, res.count);

                    fs.lstat(req.file, function (s_err, stats) {
                        if (s_err) {
                            nfs.handle_error(s_err, req, res, next);
                            return;
                        }

                        res.eof = (req.offset + nbytes) === stats.size;
                        res.setAttributes(stats);
                        res.send();
                        next();
                    });
                });
            });
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


test('access', function (t) {
    this.client.access('/tmp', nfs.ACCESS3_READ, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.obj_attributes);
        t.equal(reply.access, 63);
        t.end();
    });
});


test('read', function (t) {
    var str = '// Copyright 2013 Joyent, Inc.  All rights reserved.';
    var len = Buffer.byteLength(str);

    this.client.read(__filename, 0, len, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.file_attributes);
        t.notOk(reply.eof);
        t.ok(reply.data);
        t.equal(reply.data.toString('utf8'), str);
        t.end();
    });
});
