import * as readline from 'readline/promises';

import chalk from 'chalk';

import { tridy }               from './include/Interpreter.js';
import { parser as tokenizer } from './include/StatementParser.js';

import { global, isEmpty }                                   from './utility/common.js';
import { error_handler, SyntaxError, ClientSideServerError } from './utility/error.js';

const getPrompt = () => {
    let prompt = '@TridyDB';
    if (global.remote.enable) {
        prompt += ' @' + global.remote.host;
    }
    prompt += '>'
    
    if (!tokenizer.isCarryEmpty() && !tokenizer.isStatementComplete()) {
        prompt = '.'.repeat(prompt.length);
    }

    prompt += ' ';

    return chalk.yellow(prompt);
}

export const cli = async (opts = { }) => {
    const rl = readline.createInterface({
        input:    process.stdin,
        output:   process.stdout,
        terminal: true
    });

    rl.on("SIGINT", () => {
        rl.write(chalk.red("^C"));
        rl.clearLine(-1);
        rl.prompt();
    });

    let answers;

    while (global.exit !== true) {
        answers = await rl.question(getPrompt());

        let out;
        let retry = false;
        try {
            out = await tridy.query(answers, { accept_carry: true });
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

    rl.close();
}
