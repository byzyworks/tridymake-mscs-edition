import inquirer from 'inquirer';
import chalk    from 'chalk';

import { tridy }               from './include/Interpreter.js';
import { parser as tokenizer } from './include/StatementParser.js';

import { global }                                            from './utility/common.js';
import { error_handler, SyntaxError, ClientSideServerError } from './utility/error.js';

export const cli = async (opts = { }) => {
    // To limit redundancy, the opts defaults are defined in app.js using the Commander library.

    let answers;

    while (global.exit !== true) {
        if (tokenizer.isCarryEmpty() || tokenizer.isStatementComplete()) {
            answers = await inquirer.prompt([
                {
                    name: 'parsed',
                    message: chalk.yellow('@TridyDB>'),
                    type: 'input'
                }
            ]);
        } else {
            answers = await inquirer.prompt([
                {
                    name: 'parsed',
                    message: chalk.yellow('.........'),
                    type: 'input'
                }
            ]);
        }
        
        let out;
        let retry = false;
        try {
            out = await tridy.query(answers.parsed, {
                tokenless:    false,
                accept_carry: true,
                stringify:    true,
                pretty:       opts.pretty,
                host:         opts.host,
                port:         opts.port,
                timeout:      opts.timeout
            });
        } catch (err) {
            if ((err instanceof SyntaxError) || ((err instanceof ClientSideServerError) && (err.opts.is_fatal === false))) {
                error_handler.handle(err);
                retry = true;
            } else {
                throw err;
            }
        }

        if (!retry && (out !== '[]')) {
            console.log(out);
        }
    }
}
