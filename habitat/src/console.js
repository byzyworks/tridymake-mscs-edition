import inquirer from 'inquirer';
import chalk    from 'chalk';

import { interactive_exit }          from './controllers/vmdl/InputParser.js';
import { vmdl }                      from './controllers/vmdl/VMDL.js';
import { SyntaxError, errorHandler } from './utility/error.js';
import { isEmpty }                   from './utility/common.js';

let answers;

export const cli = async () => {
    while (!interactive_exit) {
        if (vmdl.carryIsEmpty()) {
            answers = await inquirer.prompt([
                {
                    name: 'parsed',
                    message: chalk.yellow('VMDL>'),
                    type: 'input'
                }
            ]);
        } else {
            answers = await inquirer.prompt([
                {
                    name: 'parsed',
                    message: chalk.yellow('.....'),
                    type: 'input'
                }
            ]);
        }
        
        let out;
        let retry = false;
        try {
            out = await vmdl.parse(answers.parsed, { accept_carry: true });
        } catch (err) {
            if (err instanceof SyntaxError) {
                errorHandler.handle(err);
                retry = true;
            } else {
                throw err;
            }
        }

        if (!retry && !isEmpty(out)) {
            console.log(JSON.stringify(out));
        }
    }
}
