// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var errors = require('./errors');

///--- Helpers

function _export(obj) {
    Object.keys(obj).forEach(function (k) {
        module.exports[k] = obj[k];
    });
}



///--- Exports

module.exports = {
    handle_error: function handle_error(err, req, res, next) {
        req.log.warn(err, 'stat failed');
        switch (err.code) {
        case 'EACCESS':
            res.error(errors.NFS3ERR_ACCES);
            break;

        case 'ENOENT':
            res.error(errors.NFS3ERR_NOENT);
            break;

        case 'ENOTDIR':
            res.error(errors.NFS3ERR_NOTDIR);
            break;

        default:
            res.error(errors.NFS3ERR_SERVERFAULT);
            break;
        }
        next(false);
    }
};

_export(errors);
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
_export(require('./readdir_call'));
_export(require('./readdir_reply'));
_export(require('./read_call'));
_export(require('./read_reply'));
_export(require('./server'));
