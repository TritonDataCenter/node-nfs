
var bunyan = require('bunyan');
var dashdash = require('dashdash');

var app = require('./lib');



///--- Globals

var rpc = app.rpc;
var ExportsReply = app.mount.ExportsReply;

var CLI_OPTIONS = [
    {
        names: ['help', 'h'],
        type: 'bool',
        help: 'Print this help and exit.'
    },
    {
        names: ['port', 'p'],
        type: 'positiveInteger',
        help: 'port to listen on',
        helpArg: 'PORT',
        'default': 1892
    }
];



///--- Handlers

function onExports(call, reply) {
    console.log(call)
    var res = new ExportsReply(reply);
    res.pipe(reply);
    res.end();

    // res.addMapping({
    //     name: 'portmap',
    //     prog: 100000,
    //     vers: 2,
    //     prot: 6,
    //     port: 111
    // }, true);

    // res.addMapping({
    //     name: 'nfs',
    //     prog: 100003,
    //     vers: 3,
    //     prot: 6,
    //     port: 2049
    // }, true);

    // res.addMapping({
    //     name: 'mount',
    //     prog: 100005,
    //     vers: 3,
    //     prot: 6,
    //     port: 1892
    // }, true);

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
        console.error('mount: error: %s', e.message);
        process.exit(1);
    }

    if (opts.help) {
        var help = parser.help({includeEnv: true}).trimRight();
        console.log('usage: mount [OPTIONS]\n options:\n' + help);
        process.exit(0);
    }

    log = bunyan.createLogger({
        name: 'mountd',
        level: 'info',
        stream: process.stdout,
        serializers: bunyan.stdSerializers
    })

    server = rpc.createServer({
        name: 'mount',
        log: log,
        program: 100005,
        version: 3,
        procedures: {
            exports: 5
        }
    });

    server.on('exports', onExports);

    server.listen(opts.port, function onListening() {
        log.info({
            port: opts.port
        }, 'mountd: ready');
    });
})();
