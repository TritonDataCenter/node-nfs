// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var bunyan = require('bunyan');
var nfs = require('../lib');
var rpc = require('oncrpc');



(function main() {
    var bunyan = require('bunyan');

    var log = bunyan.createLogger({
        name: 'nfsd',
        level: 'info',
        src: true,
        stream: process.stdout,
        serializers: rpc.serializers
    });

    var server = nfs.createNfsServer({
        log: log
    });

    // server.dump(function dump(req, res, next) {
    //     res.addMapping({
    //         name: '/var/tmp',
    //         dirname: '/var/tmp'
    //     });
    //     // res.addMapping({
    //     //     name: 'mount',
    //     //     prog: 100005,
    //     //     vers: 3,
    //     //     prot: 6,
    //     //     port: 1892
    //     // });
    //     res.writeHead();
    //     res.end();
    //     next();
    // });

    server.on('after', function (name, req, res, err) {
        log.info({
            rpc_call: req,
            rpc_reply: res,
            err: err
        }, '%s: handled', name);
    });

    server.start(function () {
        log.info('nfsd listening at %j', server.address());
    });
})();
