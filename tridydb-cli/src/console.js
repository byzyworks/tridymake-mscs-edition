import inquirer from 'inquirer';
import chalk    from 'chalk';

import { interactive_exit }          from './include/InputParser.js';
import { interpreter }               from './include/Interpreter.js';
import { SyntaxError, errorHandler } from './utility/error.js';
import { isEmpty }                   from './utility/common.js';

export const cli = async () => {
    let answers;

    while (!interactive_exit) {
        if (interpreter.carryIsEmpty()) {
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
                errorHandler.handle(err);
                retry = true;
            } else {
                throw err;
            }
        }

        if (!retry && !isEmpty(out)) {
            console.log(JSON.stringify(out).replace(/\\\\/g, '\\'));
        }
    }
}
