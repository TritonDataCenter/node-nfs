// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// 3.3.8 Procedure 8: CREATE - Create a file
//
//   SYNOPSIS
//
//      CREATE3res NFSPROC3_CREATE(CREATE3args) = 8;
//
//      enum createmode3 {
//           UNCHECKED = 0,
//           GUARDED   = 1,
//           EXCLUSIVE = 2
//      };
//
//      union createhow3 switch (createmode3 mode) {
//      case UNCHECKED:
//      case GUARDED:
//           sattr3       obj_attributes;
//      case EXCLUSIVE:
//           createverf3  verf;
//      };
//
//      struct CREATE3args {
//           diropargs3   where;
//           createhow3   how;
//      };
//
//      struct CREATE3resok {
//           post_op_fh3   obj;
//           post_op_attr  obj_attributes;
//           wcc_data      dir_wcc;
//      };
//
//      struct CREATE3resfail {
//           wcc_data      dir_wcc;
//      };
//
//      union CREATE3res switch (nfsstat3 status) {
//      case NFS3_OK:
//           CREATE3resok    resok;
//      default:
//           CREATE3resfail  resfail;
//      };
//
//   DESCRIPTION
//
//      Procedure CREATE creates a regular file. On entry, the
//      arguments in CREATE3args are:
//
//      where
//         The location of the file to be created:
//
//         dir
//            The file handle for the directory in which the file
//            is to be created.
//
//         name
//            The name that is to be associated with the created
//            file.  Refer to General comments on filenames on
//            page 30.
//
//      When creating a regular file, there are three ways to
//      create the file as defined by:
//
//      how
//         A discriminated union describing how the server is to
//         handle the file creation along with the appropriate
//         attributes:
//
//      mode
//         One of UNCHECKED, GUARDED, and EXCLUSIVE. UNCHECKED
//         means that the file should be created without checking
//         for the existence of a duplicate file in the same
//         directory. In this case, how.obj_attributes is a sattr3
//         describing the initial attributes for the file. GUARDED
//         specifies that the server should check for the presence
//         of a duplicate file before performing the create and
//         should fail the request with NFS3ERR_EXIST if a
//         duplicate file exists. If the file does not exist, the
//         request is performed as described for UNCHECKED.
//         EXCLUSIVE specifies that the server is to follow
//         exclusive creation semantics, using the verifier to
//         ensure exclusive creation of the target. No attributes
//         may be provided in this case, since the server may use
//         the target file metadata to store the createverf3
//         verifier.
//
//      On successful return, CREATE3res.status is NFS3_OK and the
//      results in CREATE3res.resok are:
//
//      obj
//         The file handle of the newly created regular file.
//
//      obj_attributes
//         The attributes of the regular file just created.
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires on the
//         post-CREATE directory attributes, these can be found in
//         dir_wcc.after.
//
//      Otherwise, CREATE3res.status contains the error on failure
//      and CREATE3res.resfail contains the following:
//
//      dir_wcc
//         Weak cache consistency data for the directory,
//         where.dir. For a client that requires only the
//         post-CREATE directory attributes, these can be found in
//         dir_wcc.after. Even though the CREATE failed, full
//         wcc_data is returned to allow the client to determine
//         whether the failing CREATE resulted in any change to
//         the directory.
//
//   IMPLEMENTATION
//
//      Unlike the NFS version 2 protocol, in which certain fields
//      in the initial attributes structure were overloaded to
//      indicate creation of devices and FIFOs in addition to
//      regular files, this procedure only supports the creation
//      of regular files. The MKNOD procedure was introduced in
//      the NFS version 3 protocol to handle creation of devices
//      and FIFOs. Implementations should have no reason in the
//      NFS version 3 protocol to overload CREATE semantics.
//
//      One aspect of the NFS version 3 protocol CREATE procedure
//      warrants particularly careful consideration: the mechanism
//      introduced to support the reliable exclusive creation of
//      regular files. The mechanism comes into play when how.mode
//      is EXCLUSIVE.  In this case, how.verf contains a verifier
//      that can reasonably be expected to be unique.  A
//      combination of a client identifier, perhaps the client
//      network address, and a unique number generated by the
//      client, perhaps the RPC transaction identifier, may be
//      appropriate.
//
//      If the file does not exist, the server creates the file
//      and stores the verifier in stable storage. For file
//      systems that do not provide a mechanism for the storage of
//      arbitrary file attributes, the server may use one or more
//      elements of the file metadata to store the verifier. The
//      verifier must be stored in stable storage to prevent
//      erroneous failure on retransmission of the request. It is
//      assumed that an exclusive create is being performed
//      because exclusive semantics are critical to the
//      application. Because of the expected usage, exclusive
//      CREATE does not rely solely on the normally volatile
//      duplicate request cache for storage of the verifier. The
//      duplicate request cache in volatile storage does not
//      survive a crash and may actually flush on a long network
//      partition, opening failure windows.  In the UNIX local
//      file system environment, the expected storage location for
//      the verifier on creation is the metadata (time stamps) of
//      the file. For this reason, an exclusive file create may
//      not include initial attributes because the server would
//      have nowhere to store the verifier.
//
//      If the server can not support these exclusive create
//      semantics, possibly because of the requirement to commit
//      the verifier to stable storage, it should fail the CREATE
//      request with the error, NFS3ERR_NOTSUPP.
//
//      During an exclusive CREATE request, if the file already
//      exists, the server reconstructs the file's verifier and
//      compares it with the verifier in the request. If they
//      match, the server treats the request as a success. The
//      request is presumed to be a duplicate of an earlier,
//      successful request for which the reply was lost and that
//      the server duplicate request cache mechanism did not
//      detect. If the verifiers do not match, the request is
//      rejected with the status, NFS3ERR_EXIST.
//
//      Once the client has performed a successful exclusive
//      create, it must issue a SETATTR to set the correct file
//      attributes.  Until it does so, it should not rely upon any
//      of the file attributes, since the server implementation
//      may need to overload file metadata to store the verifier.
//
//      Use of the GUARDED attribute does not provide exactly-once
//      semantics.  In particular, if a reply is lost and the
//      server does not detect the retransmission of the request,
//      the procedure can fail with NFS3ERR_EXIST, even though the
//      create was performed successfully.
//
//      Refer to General comments on filenames on page 30.
//
//   ERRORS
//
//      NFS3ERR_IO
//      NFS3ERR_ACCES
//      NFS3ERR_EXIST
//      NFS3ERR_NOTDIR
//      NFS3ERR_NOSPC
//      NFS3ERR_ROFS
//      NFS3ERR_NAMETOOLONG
//      NFS3ERR_DQUOT
//      NFS3ERR_STALE
//      NFS3ERR_BADHANDLE
//      NFS3ERR_NOTSUPP
//      NFS3ERR_SERVERFAULT
//
//   SEE ALSO
//
//      MKDIR, SYMLINK, MKNOD, and PATHCONF.

var util = require('util');

var assert = require('assert-plus');
var rpc = require('oncrpc');

var sattr3 = require('./sattr3');

var NfsCall = require('./nfs_call').NfsCall;



///--- Globals

var XDR = rpc.XDR;

var create_how = {
    UNCHECKED:  0,
    GUARDED:    1,
    EXCLUSIVE:  2
};


///--- API

function CreateCall(opts) {
    assert.object(opts, 'opts');
    assert.optionalObject(opts.where, 'opts.where');
    assert.optionalObject(opts.obj_attributes, 'opts.obj_attributes');
    assert.optionalObject(opts.verf, 'opts.verf');

    NfsCall.call(this, opts, true);

    this.where = opts.where || {
        dir: '',
        name: ''
    };
    this.how = opts.how || create_how.UNCHECKED;
    this.obj_attributes = opts.obj_attributes || {
        mode: null,
        uid: null,
        gid: null,
        size: null,
        how_a_time: 0,
        atime: null,
        how_m_time: 0,
        mtime: null
    };
    this.verf = opts.verf || null;

    this._nfs_create_call = true; // MDB
}
util.inherits(CreateCall, NfsCall);
Object.defineProperty(CreateCall.prototype, 'object', {
    get: function object() {
        return (this.where.dir);
    }
});


CreateCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        this.where.dir = xdr.readString();
        this.where.name = xdr.readString();

        this.how = xdr.readInt();

        if (this.how === create_how.EXCLUSIVE) {
            this.verf = xdr.readRaw(8);
        } else {
            this.obj_attributes = sattr3.parse(xdr);
        }

    } else {
        this.push(chunk);
    }

    cb();
};


CreateCall.prototype.writeHead = function writeHead() {
    var len = XDR.byteLength(this.where.dir) + XDR.byteLength(this.where.name);

    len += 4;

    if (this.how === create_how.EXCLUSIVE) {
        len += 8;
    } else {
        len += sattr3.length(this.obj_attributes);
    }

    var xdr = this._serialize(len);

    xdr.writeString(this.where.dir);
    xdr.writeString(this.where.name);

    xdr.writeInt(this.how);

    if (this.how === create_how.EXCLUSIVE) {
        if (!this.verf) {
            this.verf = new Buffer(8);
            this.verf.fill(0);
        }
        xdr.writeRaw(this.verf);
    } else {
        sattr3.serialize(xdr, this.obj_attributes);
    }

    this.write(xdr.buffer());
};


CreateCall.prototype.toString = function toString() {
    var fmt = '[object CreateCall <xid=%d, where=%j, how=%d, ' +
        'obj_attributes=%j, verf=%j>]';
    return (util.format(fmt, this.xid, this.where, this.how,
        this.obj_attributes, this.verf));
};



///--- Exports

module.exports = {
    CreateCall: CreateCall,
    create_how: create_how
};
