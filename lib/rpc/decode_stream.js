var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var proto = require('./proto');



///--- Helpers

function is_bit_set(x, n) {
    var rc = false;
    if (x & (1<<n))
        rc = true;
    return (rc);
}

function unset_bit(x, n) {
    return (x & ~(1<<n));
}


function parse_call_body(chunk, offset) {
    var rpcvers = chunk.readUInt32BE(offset, true);
    offset += 4;

    var prog = chunk.readUInt32BE(offset, true);
    offset +=4;

    var vers = chunk.readUInt32BE(offset, true);
    offset += 4;

    var proc = chunk.readUInt32BE(offset, true);
    offset += 4;

    // XXX - parse auth properly
    var auth = {
        type: chunk.readUInt32BE(offset, true),
        length: chunk.readUInt32BE(offset + 4, true)
    };
    offset += 8;

    var verifier = {
        type: chunk.readUInt32BE(offset, true),
        length: chunk.readUInt32BE(offset + 4, true)
    };
    offset += 8;

    return ([{
        rpcvers: rpcvers,
        prog: prog,
        vers: vers,
        proc: proc,
        auth: auth,
        verifier: verifier
    }, offset]);
}



///--- API

function RpcDecodeStream(opts) {
    if (!(this instanceof RpcDecodeStream))
        return (new RpcDecodeStream(opts));

    stream.Writable.call(this, opts);

    this._buf = null;

}
util.inherits(RpcDecodeStream, stream.Writable);


RpcDecodeStream.prototype._write = function _write(chunk, encoding, cb) {
    var length;
    var msg_type;
    var offset = 0;
    var xid;

    if (!Buffer.isBuffer(chunk))
        chunk = new Buffer(chunk, encoding);

    if (this._buf) {
        chunk = Buffer.concat(this._buf, chunk);
        this._buf = null;
    }

    // Ensure we can at least read the header
    if (chunk.length < 4) {
        this._buf = chunk
        return;
    }

    // XXX - RPC stream of fragments
    assert.ok(is_bit_set(chunk[0], 7), 'not last fragment');

    // header info
    chunk[0] = unset_bit(chunk[0], 7);
    length = chunk.readUInt32BE(offset, true);
    offset += 4;

    // XXX - underflow/overflow
    assert.equal(chunk.length, length + 4);

    // Chop the length
    //this.push(chunk.slice(4));

    xid = chunk.readUInt32BE(offset, true);
    offset += 4;

    msg_type = chunk.readInt32BE(offset, true);
    offset += 4;

    if (msg_type === 0) { // call_body
        var parsed = parse_call_body(chunk, offset);
        var offset = parsed[1];

        parsed[0].xid = xid;
        this.emit('message', parsed[0]);
        cb();
    } else {
        // XXX - can't parse responses yet
        cb(new Error('Can\'t parse rpc reply'));
    }
};



///--- Exports

module.exports = {
    RpcDecodeStream: RpcDecodeStream,

    create: function createDecodeStream(opts) {
        return (new RpcDecodeStream(opts));
    }
};
