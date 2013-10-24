// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.



///--- Helpers

function _export(obj) {
    Object.keys(obj).forEach(function (k) {
        module.exports[k] = obj[k];
    });
}



///--- Exports

module.exports = {};

_export(require('./errors'));
_export(require('./access_call'));
_export(require('./access_reply'));
_export(require('./fs_info_call'));
_export(require('./fs_info_reply'));
_export(require('./get_attr_call'));
_export(require('./get_attr_reply'));
_export(require('./nfs_call'));
_export(require('./nfs_reply'));
_export(require('./path_conf_call'));
_export(require('./path_conf_reply'));
_export(require('./server'));
