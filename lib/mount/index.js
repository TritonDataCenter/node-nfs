
///--- Helpers

function _export(obj) {
    Object.keys(obj).forEach(function (k) {
        module.exports[k] = obj[k];
    });
}



///--- Exports

module.exports = {};

_export(require('./mnt_call'));
_export(require('./mnt_reply'));
_export(require('./umnt_call'));
_export(require('./umnt_reply'));
_export(require('./dump_reply'));
_export(require('./exports_reply'));
