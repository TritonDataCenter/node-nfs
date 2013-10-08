var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');




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

function parse_int_array(chunk, offset) {
    var len = chunk.readUInt32BE(offset, true);
    offset += 4;

    // XXX parse and return int array
    offset += (len * 4);

    return ({
        offset: offset
    });
}


// Only auth types 0-2 are supported upstack.
function parse_auth(chunk, offset) {
    // opaque_auth {
    //     auth_flavor flavor
    //     opaque body<400>    variable length up to 400 bytes
    //  }
    // auth_flavor (type):
    //     auth_null  0
    //     auth_unix  1
    //     auth_short 2
    //     auth_des   3

    var type = chunk.readUInt32BE(offset, true);
    offset += 4;

    // length of opaque body
    var auth_len = chunk.readUInt32BE(offset, true);
    offset += 4;
    var end_offset = offset + auth_len;

    switch (type) {
    case 0:
        // length is normally 0 for null auth, but thats not required
        offset += auth_len;
        break;
    case 1:

        // struct auth_unix {
        //    unsigned int stamp
        //    string machinename<255>     variable length up to 255 bytes
        //    unsigned int uid
        //    unsigned int gid
        //    unsigned int gids<10>       variable length array up to 10
        // }

        var stamp = chunk.readUInt32BE(offset, true);
        offset += 4;
        var slen = chunk.readUInt32BE(offset, true);
        offset += 4;
        var machname = chunk.toString('ascii', offset, offset + slen);
        offset += slen;
        if (slen % 4 != 0)
            offset += (4 - (slen % 4));
        var uid = chunk.readUInt32BE(offset, true);
        offset += 4;
        var gid = chunk.readUInt32BE(offset, true);
        offset += 4;
        var gids = parse_int_array(chunk, offset);
        offset = gids.offset;
        break;
    case 2:
        // XXX parse
        break;
    case 3:
        // auth_des is not supported but we need to parse over the opaque data
        offset += auth_len;
        break;
    default:
        // XXX unknown auth type
        assert.fail();
        break;
    }

    assert.equal(end_offset, offset);

    return ({
        stamp: stamp,
        type: type,
        uid: uid,
        gid: gid,
        gids: gids,
        machname: machname,
        offset: offset
    });
}

function parse_call_body(chunk, offset) {
    var rpcvers = chunk.readUInt32BE(offset, true);
    offset += 4;

    var prog = chunk.readUInt32BE(offset, true);
    offset += 4;

    var vers = chunk.readUInt32BE(offset, true);
    offset += 4;

    var proc = chunk.readUInt32BE(offset, true);
    offset += 4;

    var auth = parse_auth(chunk, offset);
    offset = auth.offset;

    var verifier = parse_auth(chunk, offset);
    offset = verifier.offset;

    return ({
        rpcvers: rpcvers,
        prog: prog,
        vers: vers,
        proc: proc,
        auth: auth,
        verifier: verifier,
        offset: offset,
        buffer: chunk
    });
}



///--- API

function RpcDecodeStream(opts) {
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
        this._buf = chunk;
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
    this._buf = null;

    // Chop the length
    //this.push(chunk.slice(4));

    xid = chunk.readUInt32BE(offset, true);
    offset += 4;

    msg_type = chunk.readInt32BE(offset, true);
    offset += 4;

    if (msg_type === 0) { // call_body
        var parsed = parse_call_body(chunk, offset);

        parsed.xid = xid;
        this.emit('message', parsed);
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
