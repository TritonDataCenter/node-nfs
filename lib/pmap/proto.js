var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');

var RpcReply = require('../rpc').RpcReply;



///--- API

function PortmapDumpReply(opts) {
    RpcReply.call(this, opts);

    this.name = 'PortmapDumpReply';
    this.pmap_mappings = [];
}
util.inherits(PortmapDumpReply, RpcReply);


PortmapDumpReply.prototype._flush = function _flush(cb) {
    var self = this;
    var header = this._buildHeader({
        length: (self.pmap_mappings.length * 20) + 4
    });
    var b = header.buffer;
    var offset = header.offset;

    this.pmap_mappings.forEach(function (p) {
        b.writeUInt32BE(1, offset);
        offset += 4;
        b.writeUInt32BE(p.prog, offset);
        offset += 4;
        b.writeUInt32BE(p.vers, offset);
        offset += 4;
        b.writeUInt32BE(p.prot, offset);
        offset += 4;
        b.writeUInt32BE(p.port, offset);
        offset += 4;
    });
    b.writeUInt32BE(0, offset);

    this.push(b);
    cb();
};


PortmapDumpReply.prototype.addMapping = function addMapping(opts, noClone) {
    assert.object(opts);
    assert.optionalString(opts.name, 'options.name');
    assert.number(opts.prog, 'options.prog');
    assert.number(opts.vers, 'options.vers');
    assert.number(opts.prot, 'options.prot');
    assert.number(opts.port, 'options.port');
    assert.optionalBool(noClone, 'noClone');

    this.pmap_mappings.push(noClone ? opts : clone(opts));
};


PortmapDumpReply.prototype.toString = function toString() {
    var fmt = '[object PortmapDumpReply <xid=%d, mappings=%j>]';
    return (sprintf(fmt, this.xid, this.pmap_mappings));
};



///--- Exports

module.exports = {
    PortmapDumpReply: PortmapDumpReply
};
