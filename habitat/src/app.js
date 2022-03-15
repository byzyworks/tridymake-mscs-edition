#!/usr/bin/env node

import fs from 'fs';

import { program } from 'commander';

import { vmdl }   from './controllers/vmdl/VMDL.js';
import { cli }    from './console.js';
import { server } from './server.js';

program
    .version('1.0.0')
    .description('Specialized tool for dynamically provisioning and configuring virtual machines.')
    .option('-l, --log-level <level>', 'Control the log level used')
;

const opts = program.opts();

program.command('inline')
    .description('Read VMDL commands as a string and exit.')
    .argument('<input>', 'VMDL commands to read.')
    .action((input, options) => {
        vmdl.parse(input, { accept_carry: false });
    })
;

program.command('file')
    .description('Read VMDL commands from a file and exit.')
    .argument('<path>', 'Path of VMDL script to read.')
    .action(async (path, options) => {
        let input;
        try {
            input = await fs.promises.readFile(path);
        } catch (err) {
            console.error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);
            
            process.exit(1);
        }

        vmdl.parse(input, { accept_carry: false });
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
