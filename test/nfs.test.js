// Copyright 2014 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var statvfs = require('statvfs');
var fattr3 = require('../lib/nfs/fattr3');
require('nodeunit-plus');

var nfs = require('../lib');
var create_call = require('../lib/nfs/create_call');
var write_call = require('../lib/nfs/write_call');
var mknod_call = require('../lib/nfs/mknod_call');
var tst_dname = 'nfs_tstdir';	// use non-4 byte X length for extra testing
var tst_fname = 'nfs_testfile.test';
var tst_dir = path.join('/tmp', tst_dname);
var tst_fpath = path.join(tst_dir, tst_fname);
var tst_lname = 'nfs_testfile.lnk';
var tst_lpath = path.join(tst_dir, tst_lname);
var tst_sname = 'nfs_testfile.slnk';
var tst_spath = path.join(tst_dir, tst_sname);
var tst_data = 'The quick brown fox jumped over the lazy dog.';


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

    server.mkdir(function (req, res, next) {
        // Since we're assuming the fhandle is the file name, we can use the
        // the dir handle directly
        var nm = path.join(req.where.dir, req.where.name);
        // 0755 octal, but prepush complains about octal
        var mode = 493;
        fs.mkdir(nm, mode, function (f_err) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
            } else {
                res.obj = nm;
                try {
                    var stats = fs.lstatSync(nm);
                    res.setObjAttributes(stats);
                } catch (e) {
                    req.log.warn(e, 'create: lstat failed');
                }
                res.send();
                next();
            }
        });
    });

    server.rmdir(function (req, res, next) {
        // Since we're assuming the fhandle is the file name, we can use the
        // the dir handle directly
        var nm = path.join(req._object.dir, req._object.name);
        fs.rmdir(nm, function (f_err) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
            } else {
                res.send();
                next();
            }
        });
    });

    server.create(function (req, res, next) {
        // Since we're assuming the fhandle is the file name, we can use the
        // the dir handle directly
        var nm = path.join(req.where.dir, req.where.name);
        // 0644 octal, but prepush complains about octal
        var mode = 420;
        var flags = 'w';
        fs.open(nm, flags, mode, function (f_err, f_fd) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
            } else {
                fs.closeSync(f_fd);

                res.obj = nm;
                try {
                    var stats = fs.lstatSync(nm);
                    res.setObjAttributes(stats);
                } catch (e) {
                    req.log.warn(e, 'create: lstat failed');
                }
                res.send();
                next();
            }
        });
    });

    server.remove(function (req, res, next) {
        // Since we're assuming the fhandle is the file name, we can use the
        // the dir handle directly
        var nm = path.join(req._object.dir, req._object.name);
        fs.unlink(nm, function (f_err) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
            } else {
                res.send();
                next();
            }
        });
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

    server.setattr(function (req, res, next) {
        // XXX only implementing chmod portion of setattr for testing
        fs.chmod(req.object, req.new_attributes.mode, function (f_err) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
                return;
            }
            res.send();
            next();
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

    server.link(function (req, res, next) {
        var nm = path.join(req.link.dir, req.link.name);
        fs.link(req.file, nm, function (l_err) {
            if (l_err) {
                nfs.handle_error(l_err, req, res, next);
                return;
            }
            fs.lstat(nm, function (d_err, d_stats) {
                if (d_err) {
                    nfs.handle_error(d_err, req, res, next);
                } else {
                    res.setFileAttributes(d_stats);
                    res.send();
                    next();
                }
            });
        });
    });

    server.symlink(function (req, res, next) {
        // Since we're assuming the fhandle is the file name, we can use the
        // the dir handle directly
        var nm = path.join(req.where.dir, req.where.name);
        fs.symlink(req.symlink_data, nm, function (f_err) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
                return;
            }

            res.obj = nm;
            fs.lstat(nm, function (d_err, d_stats) {
                if (d_err) {
                    nfs.handle_error(d_err, req, res, next);
                } else {
                    res.setObjAttributes(d_stats);
                    res.send();
                    next();
                }
            });
        });
    });

    server.readlink(function (req, res, next) {
        fs.readlink(req.symlink, function (r_err, linkstr) {
            if (r_err) {
                nfs.handle_error(r_err, req, res, next);
                return;
            }

            res.data = linkstr;
            fs.lstat(req.symlink, function (d_err, d_stats) {
                if (d_err) {
                    nfs.handle_error(d_err, req, res, next);
                } else {
                    res.setAttributes(d_stats);
                    res.send();
                    next();
                }
            });
        });
    });

    server.rename(function (req, res, next) {
        // Since we're assuming the fhandle is the file name, we can use the
        // the dir handle directly
        var from = path.join(req.from.dir, req.from.name);
        var to = path.join(req.to.dir, req.to.name);
        fs.rename(from, to, function (f_err) {
            if (f_err) {
                nfs.handle_error(f_err, req, res, next);
                return;
            }
            res.send();
            next();
        });
    });

    server.write(function (req, res, next) {
        fs.open(req.file, 'r+', function (o_err, fd) {
            if (o_err) {
                nfs.handle_error(o_err, req, res, next);
                return;
            }

            fs.write(fd, req.data, 0, req.count, req.offset,
              function (r_err, nbytes, buff) {
                fs.close(fd, function (c_err) {
                    if (c_err) {
                        nfs.handle_error(c_err, req, res, next);
                        return;
                    } else if (r_err) {
                        nfs.handle_error(r_err, req, res, next);
                        return;
                    }

                    res.count = nbytes;
                    res.committed = write_call.stable_how.FILE_SYNC;

                    res.send();
                    next();
                });
            });
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
                        nfs.handle_error(r_err, req, res, next);
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

    server.commit(function (req, res, next) {
        fs.open(req.file, 'r+', function (o_err, fd) {
            if (o_err) {
                nfs.handle_error(o_err, req, res, next);
                return;
            }

            fs.fsync(fd, function (r_err, nbytes, buff) {
                fs.close(fd, function (c_err) {
                    if (c_err) {
                        nfs.handle_error(c_err, req, res, next);
                        return;
                    } else if (r_err) {
                        nfs.handle_error(r_err, req, res, next);
                        return;
                    }
                    res.send();
                    next();
                });
            });
        });
    });

    server.readdir(function (req, res, next) {
        fs.readdir(req.object, function (dir_err, files) {
            if (dir_err) {
                nfs.handle_error(dir_err, req, res, next);
                return;
            }

            var i = 1;
            files.forEach(function (f) {
                res.addEntry({
                    fileid: i++,
                    name: f,
                    cookie: 0
                });
            });
            res.eof = true;

            fs.lstat(req.object, function (err, stats) {
                if (err) {
                    nfs.handl_error(err, req, res, next);
                    return;
                }

                res.setAttributes(stats);
                res.send();
                next();
            });
        });
    });

    server.readdirplus(function (req, res, next) {
        fs.readdir(req.dir, function (dir_err, files) {
            if (dir_err) {
                nfs.handle_error(dir_err, req, res, next);
                return;
            }

            var i = 1;
            files.forEach(function (f) {
                var p = path.join(req.dir, f);
                var stats;
                try {
                    stats = fs.lstatSync(p);
                } catch (e) {
                    stats = null;
                }

                res.addEntry({
                    fileid: i++,
                    name: f,
                    cookie: 0,
                    name_attributes: fattr3.create(stats),
                    name_handle: p
                });
            });
            res.eof = true;

            fs.lstat(req.dir, function (err, stats) {
                if (err) {
                    nfs.handl_error(err, req, res, next);
                    return;
                }

                res.setAttributes(stats);
                res.send();
                next();
            });
        });
    });

    server.mknod(function (req, res, next) {
console.log('JJ in mknod');
        // res.error(nfs.NFS3ERR_NOTSUPP);
        // next(false);
        res.send();
        next();
    });

    server.pathconf(function (req, res, next) {
        res.linkmax = 32767;
        res.name_max = 255;
        res.no_trunc = true;
        res.chown_restricted = true;
        res.case_insensitive = false;
        res.case_preserving = true;
        res.send();
        next();
    });

    server.fsstat(function (req, res, next) {
        statvfs(req.object, function (err, stats) {
            if (err) {
                nfs.handl_error(err, req, res, next);
                return;
            }

            res.tbytes = stats.blocks * stats.bsize;
            res.fbytes = stats.bfree * stats.bsize;
            res.abytes = stats.bavail * stats.bsize;
            res.tfiles = stats.files;
            res.ffiles = stats.ffree;
            res.afiles = stats.favail;
            res.invarsec = 0;


            fs.lstat(req.object, function (s_err, f_stats) {
                if (s_err) {
                    nfs.handl_error(s_err, req, res, next);
                    return;
                }

                res.setAttributes(f_stats);
                res.send();
                next();
            });
        });
    });

    server.fsinfo(function (req, res, next) {
        fs.lstat(req.object, function (err, stats) {
            if (err) {
                nfs.handle_error(err, req, res, next);
                return;
            }

            res.setAttributes(stats);
            // Stolen from: http://goo.gl/fBLulQ (IBM)
            res.wtmax = res.rtmax = 65536;
            res.wtpref = res.rtpref = 32768;
            res.wtmult = res.rtmult = 4096;
            res.dtpref = 8192;

            // Our made up vals
            res.maxfilesize = 12345678;
            res.time_delta = {
                seconds: 0,
                nseconds: 1000000
            }; // milliseconds

            // TODO: this isn't right, for some reason...
            res.properties =
                nfs.FSF3_LINK     |
                nfs.FSF3_SYMLINK;
            res.send();
            next();
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


test('mkdir', function (t) {
    var where = {
        dir: '/tmp',
        name: tst_dname
    };
    this.client.mkdir(where, null, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.obj_attributes);
        // Since we're assuming the fhandle is the file name, check the handle
        t.equal(reply.obj.toString('utf8'), tst_dir);
        t.end();
    });
});


test('create', function (t) {
    var where = {
        dir: tst_dir,
        name: tst_fname
    };
    this.client.create(where, create_call.create_how.UNCHECKED, null,
      function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.obj_attributes);
        // Since we're assuming the fhandle is the file name, check the handle
        t.equal(reply.obj.toString('utf8'), tst_fpath);
        t.end();
    });
});


test('setattr', function (t) {
    var attrs = {
        mode: 438,	// 0666 octal
        uid: null,
        gid: null,
        size: null,
        how_a_time: 0,
        atime: null,
        how_m_time: 0,
        mtime: null
    };
    this.client.setattr(tst_fpath, attrs, null, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });
});


test('lookup', function (t) {
    var what = {
        dir: tst_dir,
        name: tst_fname
    };
    this.client.lookup(what, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.equal(reply.object, tst_fpath);
        t.ok(reply.obj_attributes);
        t.ok(reply.dir_attributes);
        t.end();
    });
});


test('access', function (t) {
    this.client.access(tst_fpath, nfs.ACCESS3_READ, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.obj_attributes);
        t.equal(reply.access, 63);
        t.end();
    });
});


test('link', function (t) {
    var lnk = {
        dir: tst_dir,
        name: tst_lname
    };

    this.client.link(tst_fpath, lnk, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });
});


test('symlink', function (t) {
    var where = {
        dir: tst_dir,
        name: tst_sname
    };
    this.client.symlink(where, './foo', null, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.obj_attributes);
        // Since we're assuming the fhandle is the file name, check the handle
        t.equal(reply.obj.toString('utf8'), tst_spath);
        t.end();
    });
});


test('readlink', function (t) {
    this.client.readlink(tst_spath, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.symlink_attributes);
        t.ok(reply.data);
        t.equal(reply.data.toString('utf8'), './foo');
        t.end();
    });
});


test('rename', function (t) {
    var from = {
        dir: tst_dir,
        name: tst_sname
    };
    var to = {
        dir: tst_dir,
        name: 'foobar'
    };
    this.client.rename(from, to, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });
});


test('write', function (t) {
    var len = Buffer.byteLength(tst_data);

    this.client.write(tst_fpath, 0, len, write_call.stable_how.FILE_SYNC,
      tst_data, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.count);
        t.equal(reply.count, len);
        t.ok(reply.committed);
        t.equal(reply.committed, write_call.stable_how.FILE_SYNC);
        t.end();
    });
});


test('read', function (t) {
    var len = Buffer.byteLength(tst_data);

    this.client.read(tst_fpath, 0, len, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.file_attributes);
        t.ok(reply.eof);
        t.ok(reply.data);
        t.equal(reply.data.toString('utf8'), tst_data);
        t.end();
    });
});


test('commit', function (t) {
    var len = Buffer.byteLength(tst_data);

    this.client.commit(tst_fpath, 0, len, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });
});


test('readdir', function (t) {
    var opts = {
        dir: tst_dir,
        cookie: 0,
        count: 65535
    };
    this.client.readdir(opts, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.dir_attributes);
        t.ok(Array.isArray(reply.reply));
        (reply.reply || []).forEach(function (r) {
            t.ok(r.fileid);
            t.ok(r.name);
            t.ok(r.cookie !== undefined);
        });
        t.ok(reply.eof);
        t.end();
    });
});


test('readdirplus', function (t) {
    var opts = {
        dir: tst_dir,
        cookie: 0,
        dircount: 65535,
        maxcount: 65535
    };
    this.client.readdirplus(opts, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.dir_attributes);
        t.ok(Array.isArray(reply.reply));
        (reply.reply || []).forEach(function (r) {
            t.ok(r.fileid);
            t.ok(r.name);
            t.ok(r.cookie !== undefined);
            t.ok(r.name_attributes);
            t.ok(r.name_handle);
        });
        t.ok(reply.eof);
        t.end();
    });
});


test('fsstat', function (t) {
    this.client.fsstat(tst_fpath, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.obj_attributes);
        t.ok(reply.tbytes);
        t.ok(reply.fbytes);
        t.ok(reply.abytes);
        t.ok(reply.tfiles);
        t.ok(reply.ffiles);
        t.ok(reply.afiles);
        t.ok(reply.invarsec !== undefined);
        t.end();
    });
});


// XXX unclear why we get an RPC parse erorr when this test is enabled
//test('mknod', function (t) {
//    var where = {
//        dir: tst_dir,
//        name: 'tst_dev'
//    };
//    this.client.mknod(where, mknod_call.ftype3.NF3CHR, function (err, reply) {
//        t.ifError(err);
//        t.ok(reply);
//        t.equal(reply.status, nfs.NFS3ERR_NOTSUP);
//        t.end();
//    });
//});


test('pathconf', function (t) {
    this.client.pathconf(tst_fpath, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.ok(reply.linkmax);
        t.ok(reply.name_max);
        t.ok(reply.no_trunc);
        t.ok(reply.chown_restricted);
        t.notOk(reply.case_insensitive);
        t.ok(reply.case_preserving);
        t.end();
    });
});


test('remove', function (t) {
    var where = {
        dir: tst_dir,
        name: tst_lname
    };
    this.client.remove(where, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });

    where = {
        dir: tst_dir,
        name: tst_fname
    };
    this.client.remove(where, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });

    where = {
        dir: tst_dir,
        name: 'foobar'
    };
    this.client.remove(where, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });
});


test('rmdir', function (t) {
    var where = {
        dir: '/tmp',
        name: tst_dname
    };
    this.client.rmdir(where, function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.end();
    });
});


test('fsinfo', function (t) {
    this.client.fsinfo('/tmp', function (err, reply) {
        t.ifError(err);
        t.ok(reply);
        t.equal(reply.status, 0);
        t.equal(reply.wtmax, 65536);
        t.equal(reply.rtmax, 65536);
        t.equal(reply.wtpref, 32768);
        t.equal(reply.rtpref, 32768);
        t.equal(reply.wtmult, 4096);
        t.equal(reply.rtmult, 4096);
        t.equal(reply.dtpref, 8192);
        t.equal(reply.maxfilesize, 12345678);
        t.ok(reply.time_delta);
        t.equal(reply.time_delta.seconds, 0);
        t.equal(reply.time_delta.nseconds, 1000000);

        t.equal(reply.properties, nfs.FSF3_LINK | nfs.FSF3_SYMLINK);

        t.end();
    });
});
