import inquirer from 'inquirer';
import chalk    from 'chalk';

import { tridy }               from './include/Interpreter.js';
import { parser as tokenizer } from './include/StatementParser.js';

import { global, isEmpty }                                   from './utility/common.js';
import { error_handler, SyntaxError, ClientSideServerError } from './utility/error.js';

export const cli = async (opts = { }) => {
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
            out = await tridy.query(answers.parsed, { accept_carry: true });
        } catch (err) {
            if ((err instanceof SyntaxError) || (err instanceof ClientSideServerError)) {
                error_handler.handle(err);
                retry = true;
            } else {
                throw err;
            }
        }

        if (!retry && !isEmpty(out)) {
            out = tridy.stringify(out, { pretty: opts.pretty });

            console.log(out);
        }
    }
}
