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

var time_how = {
    DONT_CHANGE:         0,
    SET_TO_SERVER_TIME:  1,
    SET_TO_CLIENT_TIME:  2
};

// struct nfstime3 {
//     uint32   seconds;
//     uint32   nseconds;
// };

// enum time_how {
//     DONT_CHANGE        = 0,
//     SET_TO_SERVER_TIME = 1,
//     SET_TO_CLIENT_TIME = 2
// };

// union set_mode3 switch (bool set_it) {
//     case TRUE:
//        mode3    mode;
//     default:
//        void;
// };

// union set_uid3 switch (bool set_it) {
//     case TRUE:
//        uid3     uid;
//     default:
//        void;
// };

// union set_gid3 switch (bool set_it) {
//     case TRUE:
//        gid3     gid;
//     default:
//        void;
// };

// union set_size3 switch (bool set_it) {
//     case TRUE:
//        size3    size;
//     default:
//        void;
// };

// union set_atime switch (time_how set_it) {
//     case SET_TO_CLIENT_TIME:
//        nfstime3  atime;
//     default:
//        void;
// };

// union set_mtime switch (time_how set_it) {
//     case SET_TO_CLIENT_TIME:
//        nfstime3  mtime;
//     default:
//        void;
// };

// struct sattr3 {
//     set_mode3   mode;
//     set_uid3    uid;
//     set_gid3    gid;
//     set_size3   size;
//     set_atime   atime;
//     set_mtime   mtime;
// };


function parse_sattr3(xdr) {
    assert.object(xdr, 'xdr');

    var mode;
    var uid;
    var gid;
    var size;
    var a_time;
    var m_time;

    if (xdr.readBool())
        mode = xdr.readInt();
    else
        mode = null;

    if (xdr.readBool())
        uid = xdr.readInt();
    else
        uid = null;

    if (xdr.readBool())
        gid = xdr.readInt();
    else
        gid = null;

    if (xdr.readBool())
        size = xdr.readHyper();
    else
        size = null;

    var how_a_time = xdr.readInt();
    if (how_a_time === time_how.SET_TO_CLIENT_TIME) {
        a_time = {
            seconds: xdr.readInt(),
            nseconds: xdr.readInt()
        };
    } else {
        a_time = null;
    }

    var how_m_time = xdr.readInt();
    if (how_m_time === time_how.SET_TO_CLIENT_TIME) {
        m_time = {
            seconds: xdr.readInt(),
            nseconds: xdr.readInt()
        };
    } else {
        m_time = null;
    }

    var sattr3 = {
        mode: mode,
        uid: uid,
        gid: gid,
        size: size,
        how_a_time: how_a_time,
        atime: a_time,
        how_m_time: how_m_time,
        mtime: m_time
    };

    return (sattr3);
}


function serialize_sattr3(xdr, sattr3) {
    assert.object(xdr, 'xdr');
    assert.object(sattr3, 'sattr3');

    if (! sattr3.mode) {
        xdr.writeBool(false);
    } else {
        xdr.writeBool(true);
        xdr.writeInt(sattr3.mode);
    }

    if (! sattr3.uid) {
        xdr.writeBool(false);
    } else {
        xdr.writeBool(true);
        xdr.writeInt(sattr3.uid);
    }

    if (! sattr3.gid) {
        xdr.writeBool(false);
    } else {
        xdr.writeBool(true);
        xdr.writeInt(sattr3.gid);
    }

    if (! sattr3.size) {
        xdr.writeBool(false);
    } else {
        xdr.writeBool(true);
        xdr.writeHyper(sattr3.size);
    }

    xdr.writeInt(sattr3.how_a_time);
    if (sattr3.how_a_time === time_how.SET_TO_CLIENT_TIME) {
        xdr.writeInt(sattr3.atime.seconds);
        xdr.writeInt(sattr3.atime.nseconds);
    }

    xdr.writeInt(sattr3.how_m_time);
    if (sattr3.how_m_time === time_how.SET_TO_CLIENT_TIME) {
        xdr.writeInt(sattr3.mtime.seconds);
        xdr.writeInt(sattr3.mtime.nseconds);
    }

    return (xdr);
}


function XDR_length(sattr3) {
    assert.object(sattr3, 'sattr3');

    var len = 0;

    len += 4;
    if (sattr3.mode)
        len += 4;

    len += 4;
    if (sattr3.uid)
        len += 4;

    len += 4;
    if (sattr3.gid)
        len += 4;

    len += 4;
    if (sattr3.size)
        len += 8;

    len += 4;
    if (sattr3.how_a_time === time_how.SET_TO_CLIENT_TIME)
        len += 8;

    len += 4;
    if (sattr3.how_m_time === time_how.SET_TO_CLIENT_TIME)
        len += 8;

    return (len);
}


///--- Exports

module.exports = {
    parse: parse_sattr3,
    serialize: serialize_sattr3,
    length: XDR_length,
    time_how: time_how
};
