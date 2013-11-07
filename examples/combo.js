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

var sattr3 = require('../lib/nfs/sattr3');

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


function set_attr(req, res, next) {
    var f = FILE_HANDLES[req.object]

    // To support the weak cache consistency data return object we must be
    // able to atomically stat the file before we set the attributes, make
    // the changes, then stat the file again once we're done. For now we'll
    // simply return that there is no wcc_data (which is allowed by the spec).

    // stat first so we can pass back params that were not provided (e.g.
    // if only have uid/gid, need the other one).
    var stats;
    try {
        stats = fs.lstatSync(f);
    } catch (e) {
        req.log.warn(e, 'set_attr: lstat failed');
        res.error(nfs.NFS3ERR_STALE);
        res.set_wcc_data();
        next(false);
        return;
    }

    // XXX translate errors into better return code below

    if (req.new_attributes.mode !== null) {
        try {
            fs.chmodSync(f, req.new_attributes.mode);
        } catch (e) {
            req.log.warn(e, 'set_attr: chmod failed');
            res.error(nfs.NFS3ERR_STALE);
            res.set_wcc_data();
            next(false);
            return;
        }
    }

    var uid;
    var gid;

    if (req.new_attributes.uid !== null)
        uid = req.new_attributes.uid;
    else
        uid = stats.uid;
   
    if (req.new_attributes.gid !== null)
        gid = req.new_attributes.gid;
    else
        gid = stats.gid;

    if (req.new_attributes.uid !== null || req.new_attributes.gid !== null) {
        try {
            fs.chownSync(f, uid, gid);
        } catch (e) {
            req.log.warn(e, 'set_attr: chown failed');
            res.error(nfs.NFS3ERR_STALE);
            res.set_wcc_data();
            next(false);
            return;
        }
    }

    var atime;
    var mtime;

    if (req.new_attributes.how_a_time === sattr3.time_how.SET_TO_CLIENT_TIME) {
        msecs = (req.new_attributes.atime.seconds * 1000) +
            (req.new_attributes.atime.nseconds / 1000000);
        atime = new Date(msecs);
    } else {
        atime = stats.atime;
    }
   
    if (req.new_attributes.how_m_time === sattr3.time_how.SET_TO_CLIENT_TIME) {
        msecs = (req.new_attributes.mtime.seconds * 1000) +
            (req.new_attributes.mtime.nseconds / 1000000);
        mtime = new Date(msecs);
    } else {
        mtime = stats.mtime;
    }

    if (req.new_attributes.how_a_time === sattr3.time_how.SET_TO_CLIENT_TIME ||
        req.new_attributes.how_m_time === sattr3.time_how.SET_TO_CLIENT_TIME) {
        try {
            fs.utimesSync(f, atime, mtime);
        } catch (e) {
            req.log.warn(e, 'set_attr: utimes failed');
            res.error(nfs.NFS3ERR_STALE);
            res.set_wcc_data();
            next(false);
            return;
        }
    }

    res.set_wcc_data();
    res.send();
    next();
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

function mkdir(req, res, next) {
    if (req.where.name === "." || req.where.name === "..") {
        req.log.warn(e, 'mkdir: dot or dotdot not allowed');
        res.error(nfs.NFS3ERR_EXIST);
        res.set_dir_wcc();
        next(false);
        return;
    }

    var dir = FILE_HANDLES[req.where.dir];

    fs.stat(dir, function (err, stats) {
        if (err) {
            res.set_dir_wcc();
            nfs.handle_error(err, req, res, next);
        } else if (!stats.isDirectory()) {
            res.error(nfs.NFS3ERR_NOTDIR);
            res.set_dir_wcc();
            next(false);
        } else {

            var nm = dir + '/' + req.where.name;
            var mode;
            if (req.attributes.mode !== null)
                mode = req.attributes.mode;
            else
                mode = 0755;

            fs.mkdir(nm, mode, function (err2) {
                if (err2) {
                    // ENOENT is not a valid return from this the procedure.
                    // If the dir disappeared, return as from the check above.
                    if (err2.code === 'ENOENT')
                        err2.code = 'ENOTDIR';
                    nfs.handle_error(err2, req, res, next);
                } else {
                    var uuid = libuuid.create();
                    FILE_HANDLES[uuid] = nm;

                    res.obj = uuid;

                    // If no uid/gid, use the parent's

                    var uid;
                    var gid;

                    if (req.attributes.uid !== null)
                        uid = req.attributes.uid;
                    else
                        uid = stats.uid;
   
                    if (req.attributes.gid !== null)
                        gid = req.attributes.gid;
                    else
                        gid = stats.gid;

                    try {
                        fs.chownSync(nm, uid, gid);
                    } catch (e) {
                        req.log.warn(e, 'mkdir: chown failed');
                    }

                    var stats2;
                    try {
                        stats2 = fs.lstatSync(nm);
                        res.setObjAttributes(stats2);
                    } catch (e) {
                        req.log.warn(e, 'mkdir: lstat failed');
                    }

                    res.set_dir_wcc();
                    res.send();
                    next();
                }
            });
        }
    });
}


function rmdir(req, res, next) {
    if (req._object.name === ".") {
        req.log.warn(e, 'rmdir: dot not allowed');
        res.error(nfs.NFS3ERR_INVAL);
        res.set_dir_wcc();
        next(false);
        return;
    }

    if (req._object.name === "..") {
        req.log.warn(e, 'rmdir: dotdot not allowed');
        res.error(nfs.NFS3ERR_EXIST);
        res.set_dir_wcc();
        next(false);
        return;
    }

    var dir = FILE_HANDLES[req._object.dir];
    var nm = dir + '/' + req._object.name;

    fs.lstat(nm, function (err, stats) {
        if (err) {
            res.set_dir_wcc();
            nfs.handle_error(err, req, res, next);
        } else if (!stats.isDirectory()) {
            res.error(nfs.NFS3ERR_NOTDIR);
            res.set_dir_wcc();
            next(false);
        } else {

            fs.rmdir(nm, function (err2) {
                if (err2) {
                    nfs.handle_error(err2, req, res, next);
                } else {
                    res.set_dir_wcc();
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


function remove(req, res, next) {
    var dir = FILE_HANDLES[req._object.dir];
    var nm = dir + '/' + req._object.name;

    fs.lstat(nm, function (err, stats) {
        if (err) {
            res.set_dir_wcc();
            nfs.handle_error(err, req, res, next);
        } else if (stats.isDirectory()) {
            res.error(nfs.NFS3ERR_ACCES);
            res.set_dir_wcc();
            next(false);
        } else {

            fs.unlink(nm, function (err2) {
                if (err2) {
                    nfs.handle_error(err2, req, res, next);
                } else {
                    res.set_dir_wcc();
                    res.send();
                    next();
                }
            });
        }
    });
}


function rename(req, res, next) {
    var fdir = FILE_HANDLES[req.from.dir];
    var fnm = fdir + '/' + req.from.name;

    var tdir = FILE_HANDLES[req.to.dir];
    var tnm = fdir + '/' + req.to.name;

    fs.rename(fnm, tnm, function (err2) {
        if (err2) {
            res.set_fromdir_wcc();
            res.set_todir_wcc();
            nfs.handle_error(err2, req, res, next);
        } else {
            res.set_fromdir_wcc();
            res.set_todir_wcc();
            res.send();
            next();
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

    nfsd.getattr(authorize, check_fh_table, get_attr);
    nfsd.setattr(authorize, check_fh_table, set_attr);
    nfsd.lookup(authorize, check_fh_table, lookup);
    nfsd.mkdir(authorize, check_fh_table, mkdir);
    nfsd.remove(authorize, check_fh_table, remove);
    nfsd.rmdir(authorize, check_fh_table, rmdir);
    nfsd.rename(authorize, check_fh_table, rename);
    nfsd.access(authorize, check_fh_table, fs_set_attrs, access);
    nfsd.read(authorize, check_fh_table, fs_set_attrs, read);
    nfsd.readdir(authorize, check_fh_table, fs_set_attrs, readdir);
    nfsd.fsstat(authorize, check_fh_table, fs_set_attrs, fs_stat);
    nfsd.fsinfo(authorize, check_fh_table, fs_set_attrs, fs_info);
    nfsd.pathconf(authorize, check_fh_table, fs_set_attrs, path_conf);

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
