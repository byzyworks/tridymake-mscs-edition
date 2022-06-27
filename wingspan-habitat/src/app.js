#!/usr/bin/env node

import { Command, Option, program } from 'commander';

import { habitat } from './include/Habitat.js';

import { APP, global }                    from './utility/common.js';
import { error_handler }                  from './utility/error.js';
import { transports, logger, log_levels } from './utility/logger.js';

import { server } from './server.js';

process.exitCode = 0;

process.on('uncaughtException', (err) => {
    error_handler.handle(err);
});

process.on('unhandledRejection', (err) => {
    error_handler.handle(err);
});

program
    .version(APP.VERSION)
    .description('Tool for managing disposable lab networks.')
    .addOption(
        new Option('-l, --log-level <level>', 'The log level used, as one of NPM\'s available log levels')
            .choices(Object.keys(log_levels))
            .default(global.defaults.log_level)
    )
    .addOption(
        new Option('-T, --templates <directory>', 'Folder to import lab templates from.')
    )
    .addOption(
        new Option('-I, --instances <directory>', 'Folder to cache lab instance data to.')
    )
    .addCommand(
        new Command('make')
            .description('Generate a new lab instance from a given template.')
            .argument('<template>', 'Lab template to generate a new instance from.')
            .action(async (template) => await habitat.make(template))
    )
    .addCommand(
        new Command('start')
            .description('Start an inactive lab instance.')
            .argument('<instance>', 'The affected lab instance.')
            .action(async (instance) => await habitat.start(instance))
    )
    .addCommand(
        new Command('pause')
            .description('Pause an active lab instance.')
            .argument('<instance>', 'The affected lab instance.')
            .action(async (instance) => await habitat.pause(instance))
    )
    .addCommand(
        new Command('stop')
            .description('Stop an active lab instance.')
            .argument('<instance>', 'The affected lab instance.')
            .action(async (instance) => await habitat.stop(instance))
    )
    .addCommand(
        new Command('restart')
            .description('Restart a lab instance.')
            .argument('<instance>', 'The affected lab instance.')
            .action(async (instance) => await habitat.restart(instance))
    )
    .addCommand(
        new Command('remake')
            .description('Re-generate a lab instance (in case using a different random seed).')
            .argument('<instance>', 'The affected lab instance.')
            .action(async (instance) => await habitat.remake(instance))
    )
    .addCommand(
        new Command('destroy')
            .description('Destroy a lab instance.')
            .argument('<instance>', 'The affected lab instance.')
            .action(async (instance) => await habitat.destroy(instance))
    )
    .addCommand(
        new Command('seed')
            .addCommand(
                new Command('force')
                    .description('Use a custom global randomness seed.')
                    .argument('<seed>', 'The custom seed.')
                    .action((seed) => habitat.seed(seed))
            )
            .addCommand(
                new Command('random')
                    .description('Use a randomly-generated global randomness seed.')
                    .action(() => habitat.seed(null))
            )
    )
    .addCommand(
        new Command('list')
            .addCommand(
                new Command('templates')
                    .description('List out all loaded lab templates.')
                    .action(() => habitat.listTemplates())
            )
            .addCommand(
                new Command('instances')
                    .description('List out all loaded lab instances.')
                    .addOption(
                        new Option('--active', 'Only list active lab instances.')
                    )
                    .action(() => habitat.listInstances())
            )
    )
    .addCommand(
        new Command('server')
            .description('Start a Habitat server.')
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
                new Option('-P, --port <port>', 'The port number to bind to when in server mode.')
                    .default(global.defaults.port)
            )
            .action(async (opts, command) => await server(command.optsWithGlobals()))
    )
    .hook('preAction', async (thisCommand, actionCommand) => {
        const opts = program.opts();
        
        global.log_level = opts.logLevel;
        transports.console.level = opts.logLevel;
        logger.verbose(`Console log level set to '${opts.logLevel}'.`);

        habitat.load(opts);
    })
;

program.parse(process.argv);
