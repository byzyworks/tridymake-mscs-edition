#!/usr/bin/env node

import fs from 'fs';

import { program } from 'commander';

import { tridy }  from './include/Interpreter.js';
import { cli }    from './console.js';
import { server } from './server.js';

import { global }             from './utility/common.js';
import { error_handler }      from './utility/error.js';
import { transports, logger } from './utility/logger.js';

process.exitCode = 0;

process.on('uncaughtException', (err) => {
    error_handler.handle(err);
});

process.on('unhandledRejection', (err) => {
    error_handler.handle(err);
});

program
    .version('1.0.0')
    .description('Specialized tool for creating portable, tree-like data files.')
    .option('-L, --log-level <level>', 'The log level used, as one of NPM\'s available log levels',               global.log_level)
    .option('--tags-key <key>',        'The key under which tags are imported and exported as',                   global.alias.tags)
    .option('--free-key <key>',        'The key under which the free data structure is imported and exported as', global.alias.state)
    .option('--tree-key <key>',        'The key under which the tree data structure is imported and exported as', global.alias.nested)
    .hook('preAction', (thisCommand) => {
        const opts = thisCommand.optsWithGlobals();
        
        if (opts.logLevel) {
            transports.console.level = opts.logLevel;
            logger.verbose(`Console log level set to '${opts.logLevel}'.`);
        }

        global.alias.tags   = opts.tagsKey  ?? global.alias.tags;
        global.alias.state  = opts.freeKey  ?? global.alias.state;
        global.alias.nested = opts.treeKey  ?? global.alias.nested;
        global.log_level    = opts.logLevel ?? global.log_level;
    })
;

program.command('inline')
    .description('Read Tridy commands as a string and exit.')
    .argument('<input>', 'Tridy commands to read.')
    .option('-P, --pretty', 'Pretty-print the output data.', global.output.pretty)
    .action(async (input, opts) => {
        global.output.pretty = opts.pretty ?? global.output.pretty;

        const output = await tridy.query(input, { accept_carry: false, stringify: true });

        console.log(output);
    })
;

program.command('file')
    .description('Read Tridy commands from any number of files and exit.')
    .argument('<paths...>', 'Paths of Tridy scripts to read.')
    .option('-P, --pretty', 'Pretty-print the output data.', global.output.pretty)
    .action(async (paths, opts) => {
        global.output.pretty = opts.pretty ?? global.output.pretty;

        let input;
        let output;

        for (const path of paths) {
            try {
                input = await fs.promises.readFile(path);
            } catch (err) {
                throw new Error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);
            }

            output = await tridy.query(input, { accept_carry: false, stringify: true });
        }

        console.log(output);
    })
;

program.command('console')
    .description('Start an interactive console session.')
    .option('-h, --host <host>',       'Server to connect to. If not given, then a temporary local (not localhost) session is created.', global.remote.host)
    .option('-p, --port <port>',       'Port to connect to, if a host is provided.',                                                     global.remote.port)
    .option('-P, --pretty',            'Pretty-print the output data.',                                                                  global.output.pretty)
    .option('-t, --timeout <timeout>', 'Timeout period (in milliseconds) to wait for responses, if a host is provided.',                 global.remote.timeout)
    .action(async (opts) => {
        global.remote.host    = opts.host    ?? global.remote.host;
        global.remote.port    = opts.port    ?? global.remote.port;
        global.remote.timeout = opts.timeout ?? global.remote.timeout;
        global.output.pretty  = opts.pretty  ?? global.output.pretty;

        await cli({ });
    })
;
    
program.command('server')
    .description('Start an interactive REST web API server.')
    .option('-4, --ipv4-only',   'Disable binding on IPv6.',                                      false)
    .option('-6, --ipv6-only',   'Disable binding on IPv4.',                                      false)
    .option('-l, --localhost',   'Bind only on localhost; do not expose service to the network.', true)
    .option('-p, --port <port>', 'The port number to bind to',                                    global.remote.port)
    .action(async (opts) => {
        await server(opts);
    })
;

program.parse(process.argv);
