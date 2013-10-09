
var bunyan = require('bunyan');
var dashdash = require('dashdash');

var app = require('./lib');



///--- Globals

var rpc = app.rpc;
var MountdMntCall = app.mount.MountdMntCall;
var MountdMntReply = app.mount.MountdMntReply;
var MountdUmntCall = app.mount.MountdUmntCall;
var MountdUmntReply = app.mount.MountdUmntReply;
var MountdDumpReply = app.mount.MountdDumpReply;
var MountdExportsReply = app.mount.MountdExportsReply;

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
    },
    {
        names: ['verbose', 'v'],
        type: 'bool',
        help: 'Debug output'
    }
];



///--- Handlers

function onMnt(call, reply, remain) {
    var log = this.log;
    var req = new MountdMntCall(call);

    var res = new MountdMntReply(reply);
    res.pipe(reply);

    // XXX successful mount and dummy handle
    res.setMntHandle(0, 1234);

    log.debug({
        req: req.toString(),
        res: res.toString()
    }, 'mnt: done');

    res.end();
}

function onDump(call, reply) {
    this.log.debug({
        call: call.toString()
    }, 'dump: entered');
    var res = new MountdDumpReply(reply);
    res.pipe(reply);

    res.addMount({
        hostname: 'us-east1.com',
        dirpath: '/manta/foo',
    }, true);

    res.addMount({
        hostname: 'us-east1.com',
        dirpath: '/manta/bar/baz',
    }, true);

    res.addMount({
        hostname: 'joyent.com',
        dirpath: '/shared/private/data',
    }, true);

    res.end();
}

function onUmnt(call, reply) {
    this.log.debug({
        call: call.toString()
    }, 'umnt: entered');

    var req = new MountdUmntCall(call);

    var res = new MountdUmntReply(reply);
    res.pipe(reply);

    // XXX do whatever we want to do for umount

    res.end();
}


function onUmntAll(call, reply) {
    this.log.debug({
        call: call.toString()
    }, 'umntall: entered');

    var res = new MountdUmntReply(reply);
    res.pipe(reply);

    // XXX do whatever we want to do for umount

    res.end();
}


function onExports(call, reply) {
    this.log.debug({
        call: call.toString()
    }, 'exports: entered');
    var res = new MountdExportsReply(reply);
    res.pipe(reply);

    res.addExport({
        dirpath: '/zones/foo',
        groups: []
    }, true);

    res.addExport({
        dirpath: '/share/bar/baz',
        groups: []
    }, true);

    res.addExport({
        dirpath: '/home/manta',
        groups: []
    }, true);

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
        level: opts.verbose ? 'debug' : 'info',
        stream: process.stdout,
        serializers: bunyan.stdSerializers
    });

    server = rpc.createServer({
        name: 'mount',
        log: log,
        program: 100005,
        version: 3,
        procedures: {
            mnt: 1,
            dump: 2,
            umnt: 3,
            umntall: 4,
            exports: 5
        }
    });

    //           MOUNTPROC3_NULL(void)    = 0;
    // mountres3 MOUNTPROC3_MNT(dirpath)  = 1;
    // mountlist MOUNTPROC3_DUMP(void)    = 2;
    // void      MOUNTPROC3_UMNT(dirpath) = 3;
    // void      MOUNTPROC3_UMNTALL(void) = 4;
    // export    MOUNTPROC3_EXPORT(void)  = 5;

    server.on('mnt', onMnt.bind(server));
    server.on('dump', onDump.bind(server));
    server.on('umnt', onUmnt.bind(server));
    server.on('umntall', onUmntAll.bind(server));
    server.on('exports', onExports.bind(server));

    server.listen(opts.port, function onListening() {
        log.info({
            port: opts.port
        }, 'mountd: ready');
    });
})();
