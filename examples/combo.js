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
var vasync = require('vasync')



///--- Globals

var FILE_HANDLES = {};
var MOUNTS = {};



////--- Private Functions

function  authorize(req, res, next) {
    // Let everything through
    // if (!req.is_user(0)) {
    //     res.status = nfs.NFS3ERR_ACCES;
    //     res.send();
    //     next(false);
    // } else {
    //     next();
    // }
    next();
}


function check_dirpath(req, res, next) {
    assert.string(req.dirpath, 'req.dirpath');

    var p = path.normalize(req.dirpath);
    req._dirpath = p;
    if (p.length > 64) {
        res.error(nfs.NFS3ERR_NAMETOOLONG);
        next(false);
        return;
    }

    fs.stat(p, function (err, stats) {
        if (err) {
            nfs.handle_error(err, req, res, next);
        } else if (!stats.isDirectory()) {
            res.error(nfs.NFS3ERR_NOTDIR);
            next(false);
        } else {
            next();
        }
    });
}


function mount(req, res, next) {
    var uuid = libuuid.create();
    MOUNTS[uuid] = req._dirpath;
    FILE_HANDLES[uuid] = req._dirpath;
    res.setFileHandle(uuid);
    res.send();
    next();
}


function umount(req, res, next) {
    res.send();
    next();
}


function check_fh_table(req, res, next) {
    if (!FILE_HANDLES[req.object]) {
        req.log.warn({
            call: req.toString(),
            object: req.object
        }, 'check_fh_table: object not found');
        res.error(nfs.NFS3ERR_STALE);
        next(false);
    } else {
        next();
    }
}


function get_attr(req, res, next) {
    var f = FILE_HANDLES[req.object]
    fs.lstat(f, function (err, stats) {
        if (err) {
            req.log.warn(err, 'get_attr: lstat failed');
            res.error(nfs.NFS3ERR_STALE);
            next(false);
        } else {
            res.setAttributes(stats);
            res.send();
            next();
        }
    });
}


function fs_set_attrs(req, res, next) {
    var f = FILE_HANDLES[req.object];
    fs.lstat(f, function (err, stats) {
        if (err) {
            nfs.handle_error(err, req, res, next);
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

    // TODO: this isn't right, for some reason...
    res.properties =
        nfs.FSF3_LINK     |
        nfs.FSF3_SYMLINK;

    res.send();
    next();
}



function fs_stat(req, res, next) {
    var f = FILE_HANDLES[req.object];
    statvfs(f, function (err, stats) {
        if (err) {
            req.log.warn(err, 'fs_stat: statvfs failed');
            res.error(nfs.NFS3ERR_STALE);
            next(false);
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


function path_conf(req, res, next) {
    // var f = FILE_HANDLES[req.object];
    // TODO: call pathconf(2)
    res.linkmax = 32767;
    res.name_max = 255;
    res.no_trunc = true;
    res.chown_restricted = true;
    res.case_insensitive = false;
    res.case_preserving = true;
    res.send();
    next();
}


function access(req, res, next) {
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


function lookup(req, res, next) {
    var dir = FILE_HANDLES[req.what.dir];

    fs.lstat(dir, function (err, stats) {
        if (err) {
            nfs.handle_error(err, req, res, next);
        } else {
            res.setDirAttributes(stats);

            var f = path.resolve(dir, req.what.name);
            fs.lstat(f, function (err2, stats2) {
                if (err2) {
                    nfs.handle_error(err2, req, res, next);
                } else {


                    var uuid = libuuid.create();
                    FILE_HANDLES[uuid] = f;

                    res.object = uuid;
                    res.setAttributes(stats2);

                    res.send();
                    next();
                }
            });
        }
    });
}


function readdir(req, res, next) {
    var dir = FILE_HANDLES[req.dir];
    fs.readdir(dir, function (err, files) {
        if (err) {
            nfs.handle_error(err, req, res, next);
        } else {
            res.eof = (files.length < req.count);
            res.setDirAttributes(req._stats);

            var barrier = vasync.barrier();
            var error = null;

            barrier.once('drain', function () {
                if (error) {
                    nfs.handle_error(error, req, res, next);
                } else {
                    res.send();
                    next();
                }
            });

            files.forEach(function (f) {
                barrier.start('stat::' + f);

                var p = path.join(dir, f);

                fs.stat(p, function (err2, stat) {
                    barrier.done('stat::' + f);
                    if (err2) {
                        error = error || err2;
                    } else {
                        res.addEntry({
                            fileid: stat.ino,
                            name: f,
                            cookie: stat.mtime.getTime()
                        });
                    }
                });
            });
        }
    });
}


function read(req, res, next) {
    var f = FILE_HANDLES[req.file];
    fs.open(f, 'r', function (open_err, fd) {
        if (open_err) {
            nfs.handle_error(open_err, req, res, next);
            return;
        }

        res.data = new Buffer(req.count);
        fs.read(fd, res.data, 0, req.count, req.offset, function (err, n) {
            if (err) {
                nfs.handle_error(err, req, res, next);
            } else {
                res.count = n;
                res.eof = true; // TODO
                res.send();
                next();
            }
        });
    });
}



///--- Mainline

(function main() {
    function logger(name) {
        return (bunyan.createLogger({
            name: name,
            level: process.env.LOG_LEVEL || 'debug',
            src: true,
            stream: process.stdout,
            serializers: rpc.serializers
        }));
        return (l);
    }

    var portmapd = rpc.createPortmapServer({
        name: 'portmapd',
        log: logger('portmapd')
    });

    var mountd = nfs.createMountServer({
        name: 'mountd',
        log: logger('mountd')
    });

    var nfsd = nfs.createNfsServer({
        name: 'nfsd',
        log: logger('nfsd')
    });

    portmapd.get_port(function get_port(req, res, next) {
        if (req.mapping.prog === 100003) {
            res.port = 2049;
        } else if (req.mapping.prog === 100005) {
            res.port = 1892;
        }

        res.send();
        next();
    });

    mountd.mnt(authorize, check_dirpath, mount);
    mountd.umnt(authorize, check_dirpath, umount);

    nfsd.access(authorize, check_fh_table, fs_set_attrs, access);
    nfsd.get_attr(authorize, check_fh_table, get_attr);
    nfsd.fs_info(authorize, check_fh_table, fs_set_attrs, fs_info);
    nfsd.fs_stat(authorize, check_fh_table, fs_set_attrs, fs_stat);
    nfsd.path_conf(authorize, check_fh_table, fs_set_attrs, path_conf);
    nfsd.lookup(authorize, check_fh_table, lookup);
    nfsd.readdir(authorize, check_fh_table, fs_set_attrs, readdir);
    nfsd.read(authorize, check_fh_table, fs_set_attrs, read);

    var log = logger('audit');
    function after(name, req, res, err) {
        log.info({
            call: req.toString(),
            reply: res.toString(),
            err: err
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
