import inquirer from 'inquirer';
import chalk    from 'chalk';

import { vmdl } from './controllers/vmdl/VMDL.js';

let answers;

export const cli = async () => {
    while (true) {
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
        
        vmdl.parse(answers.parsed);
    }
}
