import inquirer from 'inquirer';
import chalk    from 'chalk';

import { vmdl } from './controllers/vmdl/VMDL.js';

let answers;

export const cli = async () => {
    while (true) {
        answers = await inquirer.prompt([
            {
                name: 'parsed',
                message: chalk.yellow('VMDL>'),
                type: 'input'
            }
        ]);
        
        vmdl.parse(answers.parsed);
    }
}