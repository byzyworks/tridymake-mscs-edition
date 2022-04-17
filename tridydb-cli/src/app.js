#!/usr/bin/env node

import fs from 'fs';

import { program } from 'commander';

import { tridy }              from './include/Interpreter.js';
import { global }              from './utility/common.js';
import { error_handler }      from './utility/error.js';
import { transports, logger } from './utility/logger.js';
import { cli }                from './console.js';
import { server }             from './server.js';

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
    .option('-l, --log-level <level>', 'The log level used, as one of NPM\'s available log levels')
    .option('--tags-key <key>', 'The key under which tags are imported and exported as', 'tags')
    .option('--free-key <key>', 'The key under which the free data structure is imported and exported as', 'free')
    .option('--tree-key <key>', 'The key under which the tree data structure is imported and exported as', 'tree')
    .hook('preAction', (thisCommand) => {
        const opts = thisCommand.optsWithGlobals();
        
        if (opts.logLevel) {
            transports.console.level = opts.logLevel;
            logger.verbose(`Console log level set to '${opts.logLevel}'.`);
        }
        
        global.alias = { };
        if (opts.tagsKey) {
            global.alias.tags = opts.tagsKey;
        }
        if (opts.freeKey) {
            global.alias.state = opts.freeKey;
        }
        if (opts.treeKey) {
            global.alias.nested = opts.treeKey;
        }
    })
;

program.command('inline')
    .description('Read Tridy commands as a string and exit.')
    .argument('<input>', 'Tridy commands to read.')
    .option('-p, --pretty', 'Pretty-print output data.')
    .action((input, opts) => {
        const out = tridy.parse(input, { accept_carry: false, stringify: true, pretty: opts.pretty });

        console.log(out);
    })
;

program.command('file')
    .description('Read Tridy commands from a file and exit.')
    .argument('<path>', 'Path of Tridy script to read.')
    .option('-p, --pretty', 'Pretty-print output data.')
    .action(async (path, opts) => {
        let input;
        try {
            input = await fs.promises.readFile(path);
        } catch (err) {
            throw new Error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);
        }

        const out = tridy.parse(input, { accept_carry: false, stringify: true, pretty: opts.pretty });

        console.log(out);
    })
;

program.command('console')
    .description('Start an interactive console session.')
    .option('-p, --pretty', 'Pretty-print output data.')
    .action(async (opts) => {
        await cli(opts);
    })
;
    
program.command('web')
    .description('Start an interactive REST web API server.')
    .option('-4, --ipv4-only', 'Disable binding on IPv6.')
    .option('-6, --ipv6-only', 'Disable binding on IPv4.')
    .option('-L, --localhost', 'Bind only on localhost; do not expose service to network.')
    .option('-p, --port <port>', 'The port number to bind to')
    .action(async (opts) => {
        await server(opts);
    })
;

program.parse(process.argv);
