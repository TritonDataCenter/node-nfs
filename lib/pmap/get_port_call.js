var util = require('util');

var assert = require('assert-plus');

var RpcCall = require('../rpc').RpcCall;



///--- Globals

var sprintf = util.format;



///--- API
function PortmapGetPortCall(opts) {
    RpcCall.call(this, opts, true);

    this.name = 'PortmapGetPortCall';
}
util.inherits(PortmapGetPortCall, RpcCall);


PortmapGetPortCall.prototype._transform = function _transform(chunk, enc, cb) {
    var offset = 0;

    this.prog = chunk.readUInt32BE(offset, true);
    offset += 4;

    this.vers = chunk.readUInt32BE(offset, true);
    offset += 4;

    this.prot = chunk.readUInt32BE(offset, true);
    offset += 4;

    this.port = chunk.readUInt32BE(offset, true);
    offset += 4;

    cb();
};


PortmapGetPortCall.prototype.toString = function toString() {
    var fmt = '[object %s <prog=%d, vers=%d, prot=%d, port=%d>]';
    var str = sprintf(fmt,
                      this.name,
                      this.prog,
                      this.vers,
                      this.prot,
                      this.port);

    return (str);
};



///--- Exports

module.exports = {
    PortmapGetPortCall: PortmapGetPortCall
};
