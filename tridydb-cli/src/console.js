import inquirer from 'inquirer';
import chalk    from 'chalk';

import { interactive_exit }    from './include/SyntaxParser.js';
import { tridy }               from './include/Interpreter.js';
import { parser as tokenizer } from './include/StatementParser.js';

import { isEmpty }            from './utility/common.js';
import { SyntaxError, error_handler } from './utility/error.js';

export const cli = async (opts = { }) => {
    opts.pretty = opts.pretty ?? false;

    let answers;

    while (!interactive_exit) {
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
            out = tridy.parse(answers.parsed, { accept_carry: true, stringify: true, pretty: opts.pretty });
        } catch (err) {
            if (err instanceof SyntaxError) {
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
