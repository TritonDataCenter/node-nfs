///--- Copyright 2013 Mark Cavage.  All rights reserved.

var net = require('net');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var clone = require('clone');

var proto = require('./proto');
var decodeStream = require('./decode_stream');



///--- Globals

var sprintf = util.format;



///--- Private Methods
// "this" is bound to an RpcServer

function onConnection(c) {
    var decoder = decodeStream.create();
    var self = this;

    function return_error(reply) {
        reply.pipe(c);
        reply.end();
    }

    decoder.on('message', function onRpcMessage(call) {
        assert.ok(call, 'parsed RpcCall object is null');

        if (call.rpcvers !== 2) {
            return_error(new proto.RpcMismatchReply(call));
        } else if (call.prog !== self.program) {
            return_error(new proto.RpcProgramUnavailableReply(call));
        } else if (call.vers !== self.version) {
            return_error(new proto.RpcProgramMismatchReply({
                xid: call.xid,
                version: self.version
            }));
        } else if (!self.rpc_table[call.proc]) {
            if (call.proc === 0) {	// NULL RPC handler
                return_error(new proto.RpcReply(call));
            } else {
                return_error(new proto.RpcProcedureUnavailableReply(call));
            }
        } else {
            var name = self.rpc_table[call.proc];
            var req = new proto.RpcCall(call);
            var res = new proto.RpcReply(call);

            res.pipe(c);
            self.emit(name, req, res);
        }
    });

    c.pipe(decoder);
}



///--- API

/*
   An RPC service is identified by its RPC program number, version
   number, and the transport address where it may be reached.  The
   transport address, in turn, consists of a network address and a
   transport selector.  In the case of a service available over TCP/IP
   or UDP/IP, the network address will be an IP address, and the
   transport selector will be a TCP or UDP port number.
*/
function RpcService(opts) {
    assert.object(opts, 'options');
    assert.object(opts.log, 'options.log');
    assert.number(opts.program, 'options.program');
    assert.number(opts.version, 'options.version');
    assert.object(opts.procedures, 'options.procedures');

    net.Server.call(this, opts);

    var self = this;

    this.log = opts.log.child({component: 'RpcServer'}, true);
    this.program = opts.program;
    this.rpc_table = {};
    this.version = opts.version;

    Object.keys(opts.procedures).forEach(function (k) {
        self.rpc_table[parseInt(opts.procedures[k], 10)] = k;
    });

    this.on('connection', onConnection.bind(this));
}
util.inherits(RpcService, net.Server);


RpcService.prototype.toString = function toString() {
    var fmt = '[object RpcService <program=%d, version=%d>]';
    return (sprintf(fmt, this.rpc_program, this.rpc_version));
};



///--- Exports

module.exports = {
    RpcService: RpcService,

    createService: function createService(opts) {
        return (new RpcService(opts));
    },

    createServer: function createServer(opts) {
        return (module.exports.createService(opts));
    }

};
