var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');

var RpcReply = require('../rpc').RpcReply;


///--- Globals

var sprintf = util.format;


///--- API

function MountdExportsReply(opts) {
    RpcReply.call(this, opts);

    this.name = 'MountdExportsReply';
    this.exports = [];
}
util.inherits(MountdExportsReply, RpcReply);

/*
   string dirpath<MNTPATHLEN>;

   typedef struct groupnode *groups;

   struct groupnode {
        name     gr_name;
        groups   gr_next;
   };

   typedef struct exportnode *exports;

   struct exportnode {
        dirpath  ex_dir;
        groups   ex_groups;
        exports  ex_next;
   };
 */
MountdExportsReply.prototype._flush = function _flush(cb) {
    var self = this;

    // calculate length of response data
    var len = 0;
    var slen = 0;
    this.exports.forEach(function (p) {
        len += 4; // the entry's true marker

        len += 4; // dirpath string length value

        // dirpath length
        slen = p.dirpath.length;
        if (slen % 4 != 0)
            slen += (4 - (slen % 4));
        len += slen;

        // XXX assume 0 group entries for now so just need the false marker
        len += 4;
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

        // the dirpath string
        slen = p.dirpath.length;
        b.writeUInt32BE(slen, offset);
        offset += 4;
        b.write(p.dirpath, offset, slen, 'ascii');
        if (slen % 4 != 0)
            slen += (4 - (slen % 4));
        offset += slen;

        // XXX assume 0 group entries for now
        b.writeUInt32BE(0, offset);
        offset += 4;
    });
    b.writeUInt32BE(0, offset);

    this.push(b);
    cb();
};


MountdExportsReply.prototype.addExport = function addExport(opts, noClone) {
    assert.object(opts);
    assert.string(opts.dirpath, 'options.dirpath');
    assert.optionalArrayOfObject(opts.groups, 'options.groups');
    assert.optionalBool(noClone, 'noClone');

    this.exports.push(noClone ? opts : clone(opts));
};


MountdExportsReply.prototype.toString = function toString() {
    var fmt = '[object MountdExportsReply <xid=%d>]';
    return (sprintf(fmt, this.xid));
};


///--- Exports

module.exports = {
    MountdExportsReply: MountdExportsReply
};
