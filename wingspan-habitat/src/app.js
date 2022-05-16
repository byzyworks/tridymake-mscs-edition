#!/usr/bin/env node

import fs from 'fs';

import { Option, program } from 'commander';

import { server } from './server.js';

import { APP, global }                    from './utility/common.js';
import { error_handler }                  from './utility/error.js';
import { transports, logger, log_levels } from './utility/logger.js';

process.exitCode = 0;

process.on('uncaughtException', (err) => {
    error_handler.handle(err);
});

process.on('unhandledRejection', (err) => {
    error_handler.handle(err);
});

program
    .version(APP.VERSION)
    .description('Specialized database management for portable, hierarchical, tree-like data files.')
    .addOption(
        new Option('-4, --ipv4-only', 'Disable binding on IPv6 when in server mode.')
            .conflicts('ipv6Only')
    )
    .addOption(
        new Option('-6, --ipv6-only', 'Disable binding on IPv4 when in server mode.')
            .conflicts('ipv4Only')
    )
    .addOption(
        new Option('-I, --instances <file>', 'Pre-load a Tridy database from one or several files.')
            .conflicts('command')
    )
    .addOption(
        new Option('-L, --localhost', 'Bind only to localhost when in server mode; do not expose service to the network.')
    )
    .addOption(
        new Option('-l, --log-level <level>', 'The log level used, as one of NPM\'s available log levels')
            .choices(Object.keys(log_levels))
            .default(global.defaults.log_level)
    )
    .addOption(
        new Option('-M, --modules <directory>', 'Pre-load a Tridy database from one or several files.')
            .conflicts('command')
    )
    .addOption(
        new Option('-P, --port <port>', 'The port number to bind to when in server mode.')
            .default(global.defaults.remote.port)
    )
    .hook('preAction', async (thisCommand, actionCommand) => {
        const opts = program.opts();
        
        global.log_level = opts.logLevel;
        transports.console.level = opts.logLevel;
        logger.verbose(`Console log level set to '${opts.logLevel}'.`);
    })
;

program.parse(process.argv);

await server(command.optsWithGlobals());
