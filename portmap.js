
var bunyan = require('bunyan');
var dashdash = require('dashdash');

var app = require('./lib');



///--- Globals

var rpc = app.rpc;
var PortmapDumpReply = app.portmap.PortmapDumpReply;
var PortmapGetPortArg = app.portmap.PortmapGetPortArg;
var PortmapGetPortReply = app.portmap.PortmapGetPortReply;

var CLI_OPTIONS = [
    {
        names: ['help', 'h'],
        type: 'bool',
        help: 'Print this help and exit'
    },
    {
        names: ['port', 'p'],
        type: 'positiveInteger',
        help: 'port to listen on',
        helpArg: 'PORT',
        'default': 111
    },
    {
        names: ['verbose', 'v'],
        type: 'bool',
        help: 'Debug output'
    }
];



///--- Handlers

function onPortmapDump(call, reply) {
    this.log.debug({
        call: call.toString()
    }, 'dump: entered');
    var res = new PortmapDumpReply(reply);
    res.pipe(reply);

    res.addMapping({
        name: 'portmap',
        prog: 100000,
        vers: 2,
        prot: 6,
        port: 111
    }, true);

    res.addMapping({
        name: 'nfs',
        prog: 100003,
        vers: 3,
        prot: 6,
        port: 2049
    }, true);

    res.addMapping({
        name: 'mount',
        prog: 100005,
        vers: 3,
        prot: 6,
        port: 1892
    }, true);

    this.log.debug({
        reply: reply.toString()
    }, 'dump: done');

    res.end();
}

function onPortmapGetPort(call, reply) {
    this.log.debug({
        call: call.toString()
    }, 'getport: entered');

    var arg = new PortmapGetPortArg(call);
    this.log.debug({
        arg: arg.toString()
    }, 'getport: arg');

    var res = new PortmapGetPortReply(reply);
    res.pipe(reply);

    var port = 0;

    switch(arg.prog) {
    case 100000:
        switch(arg.vers) {
        case 2:
            switch(arg.prot) {
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
        switch(arg.vers) {
        case 3:
            switch(arg.prot) {
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
        switch(arg.vers) {
        case 3:
            switch(arg.prot) {
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

    res.setPort(port);

    this.log.debug({
        reply: res.toString()
    }, 'getport: done');

    res.end();
}



///--- Mainline

(function main() {
    var log;
    var opts;
    var parser = dashdash.createParser({options: CLI_OPTIONS});
    var server;

    try {
        opts = parser.parse(process.argv);
    } catch (e) {
        console.error('portmap: error: %s', e.message);
        process.exit(1);
    }

    if (opts.help) {
        var help = parser.help({includeEnv: true}).trimRight();
        console.log('usage: portmap [OPTIONS]\n options:\n' + help);
        process.exit(0);
    }

    log = bunyan.createLogger({
        name: 'portmapd',
        level: opts.verbose ? 'debug' : 'info',
        stream: process.stdout,
        serializers: bunyan.stdSerializers
    })

    server = rpc.createServer({
        name: 'portmap',
        log: log,
        program: 100000,
        version: 2,
        procedures: {
            getport: 3,
            dump: 4
        }
    });

    // PMAPPROC_NULL(void)                      = 0;
    // bool PMAPPROC_SET(mapping)               = 1;
    // bool PMAPPROC_UNSET(mapping)             = 2;
    // unsigned int PMAPPROC_GETPORT(mapping)   = 3;
    // pmaplist PMAPPROC_DUMP(void)             = 4;
    // call_result PMAPPROC_CALLIT(call_args)   = 5;

    server.on('getport', onPortmapGetPort.bind(server));
    server.on('dump', onPortmapDump.bind(server));

    server.listen(opts.port, function onListening() {
        log.info({
            port: opts.port
        }, 'portmap: ready');
    });
})();
