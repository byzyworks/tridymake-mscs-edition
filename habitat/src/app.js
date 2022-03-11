#!/usr/bin/env node

import { program } from 'commander';

import { vmdl }   from './controllers/vmdl/VMDL.js';
import { cli }    from './console.js';
import { server } from './server.js';

const Choices = {
    INLINE:  0,
    FILE:    1,
    CONSOLE: 2,
    WEB:     3
};
Object.freeze(Choices);

let choice;

program
    .version('1.0.0')
    .description('Specialized tool for dynamically provisioning and configuring virtual machines.')
    .option('-l, --log-level <level>', 'Control the log level used')
;

program.command('inline')
    .description('Read VMDL commands as a string and exit.')
    .argument('<token>', 'VMDL commands to read.')
    .action((token, options) => {
        choice = Choices.INLINE;
    })
;

program.command('file')
    .description('Read VMDL commands from a file and exit.')
    .argument('<path>', 'Path of VMDL script to read.')
    .action((path, options) => {
        choice = Choices.FILE;
    })
;

program.command('console')
    .description('Start an interactive console session.')
    .action((options) => {
        choice = Choices.CONSOLE;
    })
;
    
program.command('web')
    .description('Start an interactive REST web API server.')
    .option('-4, --ipv4-only', 'Disable binding on IPv6.')
    .option('-6, --ipv6-only', 'Disable binding on IPv4.')
    .option('-L, --localhost', 'Bind only on localhost; do not expose service to network.')
    .option('-p, --port <port>', 'The port number to bind to')
    .action((options) => {
        choice = Choices.WEB;
    })
;

program.parse(process.argv);

const opts = program.opts();
    
switch (choice) {
    case Choices.INLINE:
        console.log("Got inline!");
        break;
    case Choices.FILE:
        console.log("Got file!");
        break;
    case Choices.CONSOLE:
        await cli();
        break;
    case Choices.WEB:
        console.log("Got web!");
        break;
    default:
        break;
}
