import inquirer from 'inquirer';
import chalk    from 'chalk';

import { interactive_exit }           from './include/SyntaxParser.js';
import { interpreter }                from './include/Interpreter.js';
import { parser as tokenizer }        from './include/StatementParser.js';
import { SyntaxError, error_handler } from './utility/error.js';
import { isEmpty }                    from './utility/common.js';

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
            out = await interpreter.parse(answers.parsed, { accept_carry: true });
        } catch (err) {
            if (err instanceof SyntaxError) {
                error_handler.handle(err);
                retry = true;
            } else {
                throw err;
            }
        }

        if (!retry && !isEmpty(out)) {
            if (opts.pretty) {
                console.log(JSON.stringify(out, null, 4).replace(/\\\\/g, '\\'));
            } else {
                console.log(JSON.stringify(out).replace(/\\\\/g, '\\'));
            }
        }
    }
}
