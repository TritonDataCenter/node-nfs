var util = require('util');

var assert = require('assert-plus');

var RpcCall = require('../rpc').RpcCall;



///--- Globals

var sprintf = util.format;



///--- API
function MountdMntCall(opts) {
    RpcCall.call(this, opts, true);

    this.name = 'MountdMntCall';
}
util.inherits(MountdMntCall, RpcCall);


/*
   one parameter: string dirpath<MNTPATHLEN>
 */
MountdMntCall.prototype._transform = function _transform(chunk, enc, cb) {
    var offset = 0;

    var slen = chunk.readUInt32BE(offset, true);
    offset += 4;
    this.dirpath = chunk.toString('ascii', offset, offset + slen);
    offset += slen;
    if (slen % 4 != 0)
        offset += (4 - (slen % 4));

    cb();
};


MountdMntCall.prototype.toString = function toString() {
    var fmt = '[object %s <dirpath=%s>]';
    var str = sprintf(fmt, this.name, this.dirpath);

    return (str);
};



///--- Exports

module.exports = {
    MountdMntCall: MountdMntCall
};
