// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');



///--- Globals

var sprintf = util.format;

var XDR = rpc.XDR;



///--- API

function FileHandle(opts) {
    assert.object(opts, 'options');
    assert.string(opts.dirpath, 'options.dirpath');
    
}


FileHandle.prototype.parse = function parse() {
    
};

FileHandle.prototype.toBuffer = function toBuffer() {
    
};


FileHandle.prototype.toString = function toString() {
    var fmt = '[object FileHandle<>]';
    return (sprintf(fmt));
};



///--- Exports

module.exports = {
    MountError: MountError
};
