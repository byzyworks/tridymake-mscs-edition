#!/usr/bin/env node

import fs from 'fs';

import { Option, program } from 'commander';

import { tridy }  from './include/Interpreter.js';
import { cli }    from './console.js';
import { server } from './server.js';

import { global }                         from './utility/common.js';
import { error_handler }                  from './utility/error.js';
import { transports, logger, log_levels } from './utility/logger.js';

process.exitCode = 0;

process.on('uncaughtException', (err) => {
    error_handler.handle(err);
});

process.on('unhandledRejection', (err) => {
    error_handler.handle(err);
});

let preset;

program
    .version('1.0.0')
    .description('Specialized database management for portable, hierarchical, tree-like data files.')
    .addOption(
        new Option('-c, --command <commands>', 'Pre-load a Tridy database from a string of Tridy commands.')
            .conflicts('file')
    )
    .addOption(
        new Option('-C, --client', 'Let the server given by --remote-host do all or most of the work.')
    )
    .addOption(
        new Option('-f, --file <files...>', 'Pre-load a Tridy database from one or several files.')
            .conflicts('command')
    )
    .addOption(
        new Option('--free-key <key>', 'The key under which the free data structure is imported and exported as')
            .default(global.defaults.alias.state)
    )
    .addOption(
        new Option('-4, --ipv4-only', 'Disable binding on IPv6, if running a server.')
            .conflicts('ipv6Only')
    )
    .addOption(
        new Option('-6, --ipv6-only', 'Disable binding on IPv4, if running a server.')
            .conflicts('ipv4Only')
    )
    .addOption(
        new Option('-L, --localhost', 'Bind only to localhost if running a server; do not expose service to the network.')
    )
    .addOption(
        new Option('-l, --log-level <level>', 'The log level used, as one of NPM\'s available log levels')
            .choices(Object.keys(log_levels))
            .default(global.defaults.log_level)
    )
    .addOption(
        new Option('--pretty', 'Pretty-print the output data.')
    )
    .addOption(
        new Option('-h, --remote-host <host>', 'Server to connect to. If not given, then a temporary local (not localhost) session is created.')
            .default(global.defaults.remote.host)
    )
    .addOption(
        new Option('-p, --remote-port <port>', 'Port to connect to, if a host is provided.')
            .default(global.defaults.remote.port)
    )
    .addOption(
        new Option('-t, --remote-timeout <timeout>', 'Timeout period (in milliseconds) to wait for responses, if a host is provided.')
            .default(global.defaults.remote.timeout)
    )
    .addOption(
        new Option('-P, --server-port <port>', 'The port number to bind to if running a server.')
            .default(global.defaults.remote.port)
    )
    .addOption(
        new Option('--tags-key <key>', 'The key under which tags are imported and exported as')
            .default(global.defaults.alias.tags)
    )
    .addOption(
        new Option('--tree-key <key>', 'The key under which the tree data structure is imported and exported as')
            .default(global.defaults.alias.nested)
    )
    .hook('preAction', async () => {
        const opts = program.opts();

        global.alias        = { };
        global.alias.tags   = opts.tagsKey;
        global.alias.state  = opts.freeKey;
        global.alias.nested = opts.treeKey;
        
        global.remote         = { };
        global.remote.enable  = opts.client;
        global.remote.host    = opts.remoteHost;
        global.remote.port    = opts.remotePort;
        global.remote.timeout = opts.remoteTimeout;
        
        if (opts.logLevel) {
            transports.console.level = opts.logLevel;
            logger.verbose(`Console log level set to '${opts.logLevel}'.`);
        }
        
        if (opts.command) {
            preset = await tridy.query(opts.command, { accept_carry: false });
        } else if (opts.file) {
            preset = [ ];
        
            let input;
            for (const path of opts.file) {
                try {
                    input = await fs.promises.readFile(path);
                } catch (err) {
                    throw new Error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);
                }
        
                input = await tridy.query(input, { accept_carry: false });
                
                for (const part of input) {
                    preset.push(part);
                }
            }
        }
    })
;

program
    .command('inline')
    .description('Print the output of --command or --file and exit.')
    .action((opts, command) => {
        opts = command.optsWithGlobals();
        console.log(tridy.stringify(preset, { pretty: opts.pretty }));
    })
;

program
    .command('console')
    .description('Start an interactive console session.')
    .action(async (opts, command) => {
        await cli(command.optsWithGlobals());
    })
;

program
    .command('server')
    .description('Start a RESTful HTTP server.')
    .action(async (opts, command) => {
        await server(command.optsWithGlobals());
    })
;

program.parse(process.argv);
