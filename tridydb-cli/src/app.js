#!/usr/bin/env node

import fs from 'fs';

import { program } from 'commander';

import { interpreter }        from './include/Interpreter.js';
import { alias }              from './utility/common.js';
import { error_handler }      from './utility/error.js';
import { transports, logger } from './utility/logger.js';
import { cli }                from './console.js';
import { server }             from './server.js';

program
    .version('1.0.0')
    .description('Specialized tool for dynamically provisioning and configuring virtual machines.')
    .option('--handle-key <key>', 'The key under which the handle is imported and exported as', 'type')
    .option('--tags-key <key>', 'The key under which tags are imported and exported as', 'tags')
    .option('--state-key <key>', 'The key under which the free data structure is imported and exported as', 'free')
    .option('--nested-key <key>', 'The key under which the tree data structure is imported and exported as', 'tree')
    .option('-l, --log-level <level>', 'Control the log level used')
;

program.command('inline')
    .description('Read VMDL commands as a string and exit.')
    .argument('<input>', 'VMDL commands to read.')
    .option('-p, --pretty', 'Pretty-print output data.')
    .action(async (input, options) => {
        const out = await interpreter.parse(input, { accept_carry: false });

        if (options.pretty) {
            console.log(JSON.stringify(out, null, 4));
        } else {
            console.log(JSON.stringify(out));
        }
    })
;

program.command('file')
    .description('Read VMDL commands from a file and exit.')
    .argument('<path>', 'Path of VMDL script to read.')
    .option('-p, --pretty', 'Pretty-print output data.')
    .action(async (path, options) => {
        let skip = false;

        let input;
        try {
            input = await fs.promises.readFile(path);
        } catch (err) {
            logger.error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);

            skip = true;
        }

        if (!skip) {
            const out = await interpreter.parse(input, { accept_carry: false });

            if (options.pretty) {
                console.log(JSON.stringify(out, null, 4));
            } else {
                console.log(JSON.stringify(out));
            }
        }
    })
;

program.command('console')
    .description('Start an interactive console session.')
    .option('-p, --pretty', 'Pretty-print output data.')
    .action(async (options) => {
        await cli({ pretty: options.pretty });
    })
;
    
program.command('web')
    .description('Start an interactive REST web API server.')
    .option('-4, --ipv4-only', 'Disable binding on IPv6.')
    .option('-6, --ipv6-only', 'Disable binding on IPv4.')
    .option('-L, --localhost', 'Bind only on localhost; do not expose service to network.')
    .option('-p, --port <port>', 'The port number to bind to')
    .action(async (options) => {
        await server();
    })
;

program.parse(process.argv);

const opts = program.opts();

if (opts.logLevel) {
    transports.console.level = opts.logLevel;
    logger.verbose(`Console log level set to '${opts.logLevel}'.`);
}

if (opts.handleKey) {
    alias.handle = opts.handleKey;
}
if (opts.tagsKey) {
    alias.tags = opts.tagsKey;
}
if (opts.stateKey) {
    alias.state = opts.stateKey;
}
if (opts.nestedKey) {
    alias.nested = opts.nestedKey;
}

process.on('uncaughtException', (err) => {
    error_handler.handle(err);
});

process.on('unhandledRejection', (err) => {
    error_handler.handle(err);
});

process.exitCode = 0;
