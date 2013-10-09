var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');

var RpcReply = require('../rpc').RpcReply;


///--- Globals

var sprintf = util.format;


///--- API

function MountdDumpReply(opts) {
    RpcReply.call(this, opts);

    this.name = 'MountdDumpReply';
    this.mounts = [];
}
util.inherits(MountdDumpReply, RpcReply);

/*
   string name<MNTNAMLEN>
   string dirpath<MNTPATHLEN>

   typedef struct mountbody *mountlist;

   struct mountbody {
        name       ml_hostname;
        dirpath    ml_directory;
        mountlist  ml_next;
   };
 */
MountdDumpReply.prototype._flush = function _flush(cb) {
    var self = this;

    // calculate length of response data
    var len = 0;
    var slen = 0;
    this.exports.forEach(function (p) {
        len += 4; // the entry's true marker

        len += 4; // hostname string length value

        // hostname length
        slen = p.hostname.length;
        if (slen % 4 != 0)
            slen += (4 - (slen % 4));
        len += slen;

        len += 4; // dirpath string length value

        // dirpath length
        slen = p.dirpath.length;
        if (slen % 4 != 0)
            slen += (4 - (slen % 4));
        len += slen;

    });
    len += 4; // the final false marker

    var header = this._buildHeader({
        length: len
    });
    var b = header.buffer;
    var offset = header.offset;

    this.exports.forEach(function (p) {
        b.writeUInt32BE(1, offset);
        offset += 4;

        // the hostname string
        slen = p.hostname.length;
        b.writeUInt32BE(slen, offset);
        offset += 4;
        b.write(p.hostname, offset, slen, 'ascii');
        if (slen % 4 != 0)
            slen += (4 - (slen % 4));
        offset += slen;

        // the dirpath string
        slen = p.dirpath.length;
        b.writeUInt32BE(slen, offset);
        offset += 4;
        b.write(p.dirpath, offset, slen, 'ascii');
        if (slen % 4 != 0)
            slen += (4 - (slen % 4));
        offset += slen;
    });
    b.writeUInt32BE(0, offset);

    this.push(b);
    cb();
};


MountdDumpReply.prototype.addMount = function addMount(opts, noClone) {
    assert.object(opts);
    assert.string(opts.hostname, 'options.hostname');
    assert.string(opts.dirpath, 'options.dirpath');
    assert.optionalBool(noClone, 'noClone');

    this.mounts.push(noClone ? opts : clone(opts));
};


MountdDumpReply.prototype.toString = function toString() {
    var fmt = '[object MountdDumpReply <xid=%d>]';
    return (sprintf(fmt, this.xid));
};


///--- Exports

module.exports = {
    MountdDumpReply: MountdDumpReply
};
