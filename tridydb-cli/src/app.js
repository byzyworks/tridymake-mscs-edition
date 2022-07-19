#!/usr/bin/env node

import fs from 'fs';

import { Option, program } from 'commander';

import { Tridy } from './include/Interpreter.js';

import { APP, global, isNullish }         from './utility/common.js';
import { error_handler }                  from './utility/error.js';
import { transports, logger, log_levels } from './utility/logger.js';

import { db }     from './database.js';
import { cli }    from './console.js';
import { server } from './server.js';

process.exitCode = 0;

process.on('uncaughtException', (err) => {
    error_handler.handle(err);
});

process.on('unhandledRejection', (err) => {
    error_handler.handle(err);
});

let preset;

program
    .version(APP.VERSION)
    .description('Specialized database management for portable, hierarchical, tree-like data files.')
    .addOption(
        new Option('-c, --command <commands>', 'Pre-load a Tridy database from a string of Tridy commands.')
            .conflicts('file')
    )
    .addOption(
        new Option('-C, --client', 'Let the server given by --remote-host do most of the work.')
            .conflicts(['typeKey', 'tagsKey', 'freeKey', 'treeKey'])
    )
    .addOption(
        new Option('-k, --default-compression <compression>', 'Specify the default output compression.')
            .choices(['raw', 'typeless', 'tagless', 'trimmed', 'merged', 'final'])
            .default(global.defaults.output.compression)
    )
    .addOption(
        new Option('-F, --default-format <format>', 'Specify the default output format.')
            .choices(['json', 'yaml', 'xml'])
            .default(global.defaults.output.format)
    )
    .addOption(
        new Option('-i, --default-indent <indent>', 'Specify the default output indentation.')
            .default(global.defaults.output.indent)
    )
    .addOption(
        new Option('-j, --default-output-mode <mode>', 'Specify the default output mode.')
            .choices('auto', 'list_only', 'items_only')
            .default(global.defaults.output.list_mode)
    )
    .addOption(
        new Option('-f, --file <files...>', 'Pre-load a Tridy database from one or several files.')
            .conflicts('command')
    )
    .addOption(
        new Option('--free-key <key>', 'The key under which the free data structure is imported and exported as.')
            .default(global.defaults.alias.state)
    )
    .addOption(
        new Option('-4, --ipv4-only', 'Disable binding on IPv6 when in server mode.')
            .conflicts('ipv6Only')
    )
    .addOption(
        new Option('-6, --ipv6-only', 'Disable binding on IPv4 when in server mode.')
            .conflicts('ipv4Only')
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
        new Option('-h, --remote-host <host>', 'Destination server to connect to when in client mode.')
            .default(global.defaults.remote.host)
    )
    .addOption(
        new Option('-p, --remote-port <port>', 'Destination port to connect to when in client mode.')
            .default(global.defaults.remote.port)
    )
    .addOption(
        new Option('-s, --random-seed <seeds...>', 'Set the random seeds. If there are several, TridyDB will use the first and forward the others separately on-demand.')
    )
    .addOption(
        new Option('-t, --remote-timeout <timeout>', 'Timeout period (in milliseconds) to wait for responses when in client mode.')
            .default(global.defaults.remote.timeout)
    )
    .addOption(
        new Option('--type-key <key>', 'The key used to classify modules when printing compressed output using @merged or @final.')
            .default(global.defaults.alias.type)
    )
    .addOption(
        new Option('-P, --server-port <port>', 'The port number to bind to when in server mode.')
            .default(global.defaults.remote.port)
    )
    .addOption(
        new Option('--tags-key <key>', 'The key under which tags are imported and exported as.')
            .default(global.defaults.alias.tags)
    )
    .addOption(
        new Option('--tree-key <key>', 'The key under which the tree data structure is imported and exported as.')
            .default(global.defaults.alias.nested)
    )
    .addOption(
        new Option('--root-key <key>', 'The name given to the XML root tag. If used with @xml input, a root tag named this is also replaced with its contents. Relevant only when the output format is \'xml\'.')
            .default(global.defaults.alias.root)
    )
    .hook('preAction', async (thisCommand, actionCommand) => {
        const opts = program.opts();

        global.alias        = { };
        global.alias.type   = opts.typeKey;
        global.alias.tags   = opts.tagsKey;
        global.alias.state  = opts.freeKey;
        global.alias.nested = opts.treeKey;
        global.alias.root   = opts.rootKey;
        
        global.remote         = { };
        global.remote.enable  = opts.client;
        global.remote.host    = opts.remoteHost;
        global.remote.port    = opts.remotePort;
        global.remote.timeout = opts.remoteTimeout;

        global.output             = { };
        global.output.format      = opts.defaultFormat;
        global.output.compression = opts.defaultCompression;
        global.output.indent      = opts.defaultIndent;
        global.output.list_mode   = opts.defaultOutputMode;
        
        global.log_level = opts.logLevel;
        transports.console.level = opts.logLevel;
        logger.verbose(`Console log level set to '${opts.logLevel}'.`);
        
        if (!isNullish(opts.randomSeed)) {
            db.setRandomSeed(opts.randomSeed[0]);
        }

        if (opts.command) {
            preset = await db.query(opts.command, { accept_carry: false });
        } else if (opts.file) {
            preset = [ ];
        
            let input;
            for (const path of opts.file) {
                try {
                    input = await fs.promises.readFile(path);
                } catch (err) {
                    throw new Error(`Couldn't read "${path}"; file does not exist or is inaccessable.`);
                }
        
                input = await db.query(input, { accept_carry: false });
                
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

        if (!opts.command && !opts.file) {
            program.error('error: either --command or --file need to be given inside of inline mode.');
        }

        preset = Tridy.stringify(preset);

        console.log(preset);
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
