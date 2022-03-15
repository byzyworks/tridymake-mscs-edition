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
        
        const out = vmdl.parse(answers.parsed, { accept_carry: true });

        console.log(JSON.stringify(out));
    }
}
