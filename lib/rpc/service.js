///--- Copyright 2013 Joyent, Inc.  All rights reserved.

var domain = require('domain');
var net = require('net');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var clone = require('clone');

var RpcCall = require('./call').RpcCall;
var RpcReply = require('./reply').RpcReply;
var RpcMismatchReply = require('./rpc_mismatch').RpcMismatchReply;
var RpcNullReply = require('./null_reply').RpcNullReply;
var RpcProcedureUnavailableReply =
    require('./proc_unavail').RpcProcedureUnavailableReply;
var RpcProgramMismatchReply =
    require('./prog_mismatch').RpcProgramMismatchReply;
var RpcProgramUnavailableReply =
    require('./prog_unavail').RpcProgramUnavailableReply;
var decodeStream = require('./decode_stream');



///--- Globals

var sprintf = util.format;



///--- Private Methods
// "this" is bound to an RpcServer

function onConnection(c) {
    var decoder = decodeStream.create();
    var log = this.log;
    var self = this;

    c.on('error', function (err) {
        log.error(err, 'connection error occurred');
    });

    // XXX
    // c._end = c.end.bind(c);
    // c.end = function () {
    //     console.log(new Error().stack);
    //     c._end.apply(c, arguments);
    // };

    function return_error(reply) {
        reply.pipe(c);
        reply.end();
    }

    decoder.on('message', function onRpcMessage(call) {
        var d = domain.create();
        d.on('error', function (err) {
            log.error(err, 'uncaught error from RPC chain');
        });

        d.run(function () {
            assert.ok(call, 'parsed RpcCall object is null');

            log.debug({
                rpc_call: call
            }, 'RpcCall received');

            if (call.rpcvers !== 2) {
                return_error(new RpcMismatchReply(call));
            } else if (call.prog !== self.program) {
                return_error(new RpcProgramUnavailableReply(call));
            } else if (call.vers !== self.version) {
                return_error(new RpcProgramMismatchReply({
                    xid: call.xid,
                    version: self.version
                }));
            } else if (!self.rpc_table[call.proc]) {
                if (call.proc === 0) {
                    // NULL RPC handler
                    var _null = new RpcNullReply(call);
                    _null.pipe(c, {end: false});
                    _null.end();
                } else {
                    return_error(new RpcProcedureUnavailableReply(call));
                }
            } else {
                var name = self.rpc_table[call.proc];
                var req = new RpcCall(call);
                var res = new RpcReply(call);
                res.pipe(c, {end: false});

                self.emit(name, req, res);
            }
        });
    });

    c.pipe(decoder);
}



///--- API


// An RPC service is identified by its RPC program number, version
// number, and the transport address where it may be reached.  The
// transport address, in turn, consists of a network address and a
// transport selector.  In the case of a service available over TCP/IP
// or UDP/IP, the network address will be an IP address, and the
// transport selector will be a TCP or UDP port number.

function RpcService(opts) {
    assert.object(opts, 'options');
    assert.object(opts.log, 'options.log');
    assert.number(opts.program, 'options.program');
    assert.number(opts.version, 'options.version');
    assert.object(opts.procedures, 'options.procedures');

    net.Server.call(this, opts);

    var self = this;

    this.log = opts.log.child({
        component: 'RpcServer',
        serializers: {
            rpc_call: function (call) {
                var obj;
                if (call) {
                    obj = {
                        rpcvers: call.rpcvers,
                        prog: call.prog,
                        vers: call.vers,
                        proc: call.proc,
                        auth: {
                            type: call.auth.type
                        },
                        verifier: {
                            type: call.verifier.type
                        }
                    };
                } else {
                    obj = {};
                }
                return (obj);
            }
        }
    });
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
