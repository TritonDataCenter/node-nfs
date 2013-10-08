var util = require('util');

var assert = require('assert-plus');

var RpcReply = require('../rpc').RpcReply;



///--- Globals

var sprintf = util.format;



///--- API

function PortmapGetPortReply(opts) {
    RpcReply.call(this, opts);

    this.name = 'PortmapGetPortReply';
    this.port = 0;
}
util.inherits(PortmapGetPortReply, RpcReply);


PortmapGetPortReply.prototype._flush = function _flush(cb) {
    var header = this._buildHeader({
        length: 4
    });
    header.buffer.writeUInt32BE(this.port, header.offset);

    this.push(header.buffer);
    cb();
};


PortmapGetPortReply.prototype.setPort = function setPort(opts) {
    assert.object(opts, 'options');
    assert.number(opts.prog, 'options.prog');
    assert.number(opts.prot, 'options.prot');
    assert.number(opts.vers, 'options.vers');

    var port = 0;

    switch (opts.prog) {
    case 100000:
        switch (opts.vers) {
        case 2:
            switch (opts.prot) {
            case 6:
                port = 111;
                break;
            default:
                break;
            }
            break;
        default:
            break;
        }
        break;

    case 100003:
        switch (opts.vers) {
        case 3:
            switch (opts.prot) {
            case 6:
                port = 2049;
                break;
            default:
                break;
            }
            break;
        default:
            break;
        }
        break;

    case 100005:
        switch (opts.vers) {
        case 3:
            switch (opts.prot) {
            case 6:
                port = 1892;
                break;
            default:
                break;
            }
            break;
        default:
            break;
        }
        break;

    default:
        break;
    }

    this.port = port;
};


PortmapGetPortReply.prototype.toString = function toString() {
    var fmt = '[object PortmapGetPortReply <xid=%d, port=%d>]';
    return (sprintf(fmt, this.xid, this.port));
};



///--- Exports

module.exports = {
    PortmapGetPortReply: PortmapGetPortReply
};
