// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var rpc = require('oncrpc');



///--- Globals

var XDR = rpc.XDR;



///--- Globals

var ftype3 = {
    NF3REG:    1,
    NF3DIR:    2,
    NF3BLK:    3,
    NF3CHR:    4,
    NF3LNK:    5,
    NF3SOCK:   6,
    NF3FIFO:   7
};


// struct nfstime3 {
//     uint32   seconds;
//     uint32   nseconds;
// };

// struct specdata3 {
//     uint32     specdata1;
//     uint32     specdata2;
// };

// struct fattr3 {
//     ftype3     type;  // unit32
//     mode3      mode;  // uint32
//     uint32     nlink; // uint32
//     uid3       uid;   // uint32
//     gid3       gid;   // uint32
//     size3      size;  // uint64
//     size3      used;  // uint64
//     specdata3  rdev;
//     uint64     fsid;
//     fileid3    fileid; // uint64
//     nfstime3   atime;
//     nfstime3   mtime;
//     nfstime3   ctime;
// };


function get_type(t) {
    var type;

    if (t.isFile()) {
        type = ftype3.NF3REG;
    } else if (t.isDirectory()) {
        type = ftype3.NF3DIR;
    } else if (t.isBlockDevice()) {
        type = ftype3.NF3CHR;
    } else if (t.isSymbolicLink()) {
        type = ftype3.NF3LNK;
    } else if (t.isSocket()) {
        type = ftype3.NF3SOCK;
    } else if (t.isFIFO()) {
        type = ftype3.NF3FIFO;
    } else {
        type = -1;
    }

    return (type);
}


function create_fattr3(stats) {
    var fattr3 = {
        type:    get_type(stats),
        mode:    stats.mode,
        nlink:   stats.nlink,
        uid:     stats.uid,
        gid:     stats.gid,
        size:    stats.size,
        used:    stats.size,
        rdev: {
            specdata1:  0,
            specdata2:  0
        },
        fsid:    stats.dev,
        fileid:  stats.ino,
        atime: {
            seconds:  Math.floor(new Date(stats.atime).getTime() / 1000),
            nseconds: 0
        },
        mtime: {
            seconds:  Math.floor(new Date(stats.mtime).getTime() / 1000),
            nseconds: 0
        },
        ctime: {
            seconds:  Math.floor(new Date(stats.ctime).getTime() / 1000),
            nseconds: 0
        }
    };

    return (fattr3);
}


function parse_fattr3(xdr) {
    assert.object(xdr, 'xdr');

    var fattr3 = {
        type: xdr.readInt(),
        mode: xdr.readInt(),
        nlink: xdr.readInt(),
        uid: xdr.readInt(),
        gid: xdr.readInt(),
        size: xdr.readHyper(),
        used: xdr.readHyper(),
        rdev: {
            specdata1: xdr.readInt(),
            specdata2: xdr.readInt()
        },
        fsid: xdr.readHyper(),
        fileid: xdr.readHyper(),
        atime: {
            seconds: xdr.readInt(),
            nseconds: xdr.readInt()
        },
        mtime: {
            seconds: xdr.readInt(),
            nseconds: xdr.readInt()
        },
        ctime: {
            seconds: xdr.readInt(),
            nseconds: xdr.readInt()
        }
    };

    return (fattr3);
}


function serialize_fattr3(xdr, fattr3) {
    assert.object(xdr, 'xdr');
    assert.object(fattr3, 'fattr3');

    xdr.writeInt(fattr3.type);
    xdr.writeInt(fattr3.mode);
    xdr.writeInt(fattr3.nlink);
    xdr.writeInt(fattr3.uid);
    xdr.writeInt(fattr3.gid);
    xdr.writeHyper(fattr3.size);
    xdr.writeHyper(fattr3.used);
    xdr.writeInt(fattr3.rdev.specdata1);
    xdr.writeInt(fattr3.rdev.specdata2);
    xdr.writeHyper(fattr3.fsid);
    xdr.writeHyper(fattr3.fileid);
    xdr.writeInt(fattr3.atime.seconds);
    xdr.writeInt(fattr3.atime.nseconds);
    xdr.writeInt(fattr3.mtime.seconds);
    xdr.writeInt(fattr3.mtime.nseconds);
    xdr.writeInt(fattr3.ctime.seconds);
    xdr.writeInt(fattr3.ctime.nseconds);

    return (xdr);
}



///--- Exports

module.exports = {
    create: create_fattr3,
    create_fattr3: create_fattr3,
    parse: parse_fattr3,
    serialize: serialize_fattr3,
    XDR_SIZE: 84
};
