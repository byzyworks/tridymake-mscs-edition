#!/usr/bin/env node

import fs from 'fs';

import { program }    from 'commander';

import { vmdl }               from './controllers/vmdl/VMDL.js';
import { errorHandler }       from './utility/error.js';
import { transports, logger } from './utility/logger.js';
import { cli }                from './console.js';
import { server }             from './server.js';

program
    .version('1.0.0')
    .description('Specialized tool for dynamically provisioning and configuring virtual machines.')
    .option('-l, --log-level <level>', 'Control the log level used')
;

program.command('inline')
    .description('Read VMDL commands as a string and exit.')
    .argument('<input>', 'VMDL commands to read.')
    .action((input, options) => {
        const out = vmdl.parse(input, { accept_carry: false });

        console.log(JSON.stringify(out));
    })
;

program.command('file')
    .description('Read VMDL commands from a file and exit.')
    .argument('<path>', 'Path of VMDL script to read.')
    .action(async (path, options) => {
        let skip = false;

        let input;
        try {
            input = await fs.promises.readFile(path);
        } catch (err) {
            logger.error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);

            skip = true;
        }

        if (skip) {
            const out = vmdl.parse(input, { accept_carry: false });

            console.log(JSON.stringify(out));
        }
    })
;

program.command('console')
    .description('Start an interactive console session.')
    .action(async (options) => {
        await cli();
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

process.on('uncaughtException', (err) => {
    errorHandler.handle(err);
});

process.on('unhandledRejection', (err) => {
    errorHandler.handle(err);
});

process.exitCode = 0;
