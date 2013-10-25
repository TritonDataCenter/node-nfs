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

var mnt_err = require('./errors');
var MountReply = require('./mount_reply').MountReply;


///--- API

function MountUmntReply(opts) {
    MountReply.call(this, opts);

    this._nfs_mount_umnt_reply = true; // MDB
}
util.inherits(MountUmntReply, MountReply);
MountUmntReply.prototype.__defineSetter__('status', function (s) {});
MountUmntReply.prototype.__defineGetter__('status', function () {
    return (0);
});
MountUmntReply.prototype._allowed_error_codes = [];


MountUmntReply.prototype.toString = function toString() {
    var fmt = '[object MountUmntReply <xid=%d>]';
    return (util.format(fmt, this.xid));
};



///--- Exports

module.exports = {
    MountUmntReply: MountUmntReply
};
