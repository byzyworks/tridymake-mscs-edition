#!/usr/bin/env node

import fs from 'fs';

import { Option, program } from 'commander';

import { tridy }  from './include/Interpreter.js';
import { cli }    from './console.js';
import { server } from './server.js';

import { global }                         from './utility/common.js';
import { error_handler }                  from './utility/error.js';
import { transports, logger, log_levels } from './utility/logger.js';

const setAliases = (command) => {
    const opts = command.opts();

    global.alias        = { };
    global.alias.tags   = opts.tags_key;
    global.alias.state  = opts.free_key;
    global.alias.nested = opts.tree_key;
}

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
    .addOption(new Option('-L, --log-level <level>', 'The log level used, as one of NPM\'s available log levels')
        .choices(Object.keys(log_levels))
        .default(global.defaults.log_level)
    )
    .hook('preAction', () => {
        const opts = program.opts();
        
        if (opts.logLevel) {
            transports.console.level = opts.logLevel;
            logger.verbose(`Console log level set to '${opts.logLevel}'.`);
        }
    })
;

program.command('inline')
    .description('Read Tridy commands as a string and exit.')
    .argument('<input>', 'Tridy commands to read.')
    .option('-P, --pretty',     'Pretty-print the output data.',                                           global.defaults.output.pretty)
    .option('--tags-key <key>', 'The key under which tags are imported and exported as',                   global.defaults.alias.tags)
    .option('--free-key <key>', 'The key under which the free data structure is imported and exported as', global.defaults.alias.state)
    .option('--tree-key <key>', 'The key under which the tree data structure is imported and exported as', global.defaults.alias.nested)
    .hook('preAction', setAliases)
    .action(async (input, opts) => {
        let output;
        output = await tridy.query(input, { accept_carry: false });
        output = tridy.stringify(output, { pretty: opts.pretty });

        console.log(output);
    })
;

program.command('file')
    .description('Read Tridy commands from any number of files and exit.')
    .argument('<paths...>',     'Paths of Tridy scripts to read.')
    .option('-P, --pretty',     'Pretty-print the output data.',                                           global.defaults.output.pretty)
    .option('--tags-key <key>', 'The key under which tags are imported and exported as',                   global.defaults.alias.tags)
    .option('--free-key <key>', 'The key under which the free data structure is imported and exported as', global.defaults.alias.state)
    .option('--tree-key <key>', 'The key under which the tree data structure is imported and exported as', global.defaults.alias.nested)
    .hook('preAction', setAliases)
    .action(async (paths, opts) => {
        let output = [ ];

        let input;
        let file_output;
        for (const path of paths) {
            try {
                input = await fs.promises.readFile(path);
            } catch (err) {
                throw new Error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);
            }

            file_output = await tridy.query(input, { accept_carry: false });

            for (const part of file_output) {
                output.push(part);
            }
        }

        output = tridy.stringify(output, { pretty: opts.pretty });

        console.log(output);
    })
;

program.command('sandbox')
    .description('Start an interactive, standalone console session.')
    .option('-P, --pretty',     'Pretty-print the output data.',                                           global.defaults.output.pretty)
    .option('--tags-key <key>', 'The key under which tags are imported and exported as',                   global.defaults.alias.tags)
    .option('--free-key <key>', 'The key under which the free data structure is imported and exported as', global.defaults.alias.state)
    .option('--tree-key <key>', 'The key under which the tree data structure is imported and exported as', global.defaults.alias.nested)
    .hook('preAction', setAliases)
    .action(async (opts) => {
        await cli(false, opts);
    })
;

program.command('client')
    .description('Start an interactive console session that links to a server.')
    .option('-h, --host <host>',       'Server to connect to. If not given, then a temporary local (not localhost) session is created.', global.defaults.remote.host)
    .option('-p, --port <port>',       'Port to connect to, if a host is provided.',                                                     global.defaults.remote.port)
    .option('-P, --pretty',            'Pretty-print the output data.',                                                                  global.defaults.output.pretty)
    .option('-t, --timeout <timeout>', 'Timeout period (in milliseconds) to wait for responses, if a host is provided.',                 global.defaults.remote.timeout)
    .action(async (opts) => {
        await cli(true, opts);
    })
;
    
program.command('server')
    .description('Start an interactive REST web API server.')
    .option('-4, --ipv4-only',   'Disable binding on IPv6.',                                                false)
    .option('-6, --ipv6-only',   'Disable binding on IPv4.',                                                false)
    .option('-l, --localhost',   'Bind only on localhost; do not expose service to the network.',           false)
    .option('-p, --port <port>', 'The port number to bind to',                                              global.defaults.remote.port)
    .option('--tags-key <key>',  'The key under which tags are imported and exported as',                   global.defaults.alias.tags)
    .option('--free-key <key>',  'The key under which the free data structure is imported and exported as', global.defaults.alias.state)
    .option('--tree-key <key>',  'The key under which the tree data structure is imported and exported as', global.defaults.alias.nested)
    .hook('preAction', setAliases)
    .action(async (opts) => {
        await server(opts);
    })
;

program.parse(process.argv);
