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

var fattr3 = require('./fattr3');


///--- Globals

var XDR = rpc.XDR;



// struct nfstime3 {
//     uint32   seconds;
//     uint32   nseconds;
// };

// struct wcc_attr {
//     size3       size;   // uint64
//     nfstime3    mtime;
//     nfstime3    ctime;
// };

// union pre_op_attr switch (bool attributes_follow) {
//     case TRUE:
//          wcc_attr  attributes;
//     case FALSE:
//          void;
// };

// union post_op_attr switch (bool attributes_follow) {
//     case TRUE:
//        fattr3   attributes;
//     case FALSE:
//        void;
// };

// struct wcc_data {
//     pre_op_attr    before;
//     post_op_attr   after;
// };

// To support the weak cache consistency data return object we must be
// able to atomically stat the file before we make any changes, make
// the changes, then stat the file again once we're done.

function create_wcc_data() {
    var wcc_data = {
        before: null,
        after: null
    };

    return (wcc_data);
}


function parse_wcc_data(xdr) {
    assert.object(xdr, 'xdr');

    var before;
    var after;

    if (xdr.readBool()) {
        var size = xdr.readHyper();

        var m_time = {
            seconds: xdr.readInt(),
            nseconds: xdr.readInt()
        };

        var c_time = {
            seconds: xdr.readInt(),
            nseconds: xdr.readInt()
        };

        before = {
            size: size,
            mtime: m_time,
            ctime: c_time
        };
    } else {
        before = null;
    }

    if (xdr.readBool()) {
        after = fattr3.parse(xdr);
    } else {
        after = null;
    }

    var wcc_data = {
        before: before,
        after: after
    };

    return (wcc_data);
}


function serialize_wcc_data(xdr, wcc_data) {
    if (wcc_data === undefined || wcc_data === null) {
        xdr.writeBool(false);
        xdr.writeBool(false);
        return (xdr);
    }

    if (! wcc_data.before) {
        xdr.writeBool(false);
    } else {
        xdr.writeBool(true);
        xdr.writeHyper(wcc_data.size);
        xdr.writeInt(wcc_data.mtime.seconds);
        xdr.writeInt(wcc_data.mtime.nseconds);
        xdr.writeInt(wcc_data.ctime.seconds);
        xdr.writeInt(wcc_data.ctime.nseconds);
    }

    if (! wcc_data.after) {
        xdr.writeBool(false);
    } else {
        xdr.writeBool(true);
        fattr3.serialize_fattr3(xdr, wcc_data.after);
    }

    return (xdr);
}


function XDR_length(wcc_data) {
    var len = 0;

    if (wcc_data === undefined || wcc_data === null) {
        len = 8;
    } else {
        len += 4;
        if (wcc_data.before)
            len += 24;

        len += 4;
        if (wcc_data.after)
            len += 24;
    }

    return (len);
}


///--- Exports

module.exports = {
    create: create_wcc_data,
    parse: parse_wcc_data,
    serialize: serialize_wcc_data,
    length: XDR_length
};
