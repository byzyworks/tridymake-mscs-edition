import * as readline from 'readline/promises';

import chalk from 'chalk';

import { Tridy } from './include/Interpreter.js';

import { global, isEmpty }                                   from './utility/common.js';
import { error_handler, SyntaxError, ClientSideServerError } from './utility/error.js';

import { db } from './database.js';

const getPrompt = () => {
    let prompt = '@TridyDB';
    if (global.remote.enable) {
        prompt += ' @' + global.remote.host;
    }
    prompt += '>';
    
    if (db.isCarrying()) {
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
        db.clearCarry();
        rl.setPrompt(getPrompt());

        rl.write(chalk.red("^C"));
        rl.clearLine(-1);
        rl.prompt();
    });

    let answers;

    while (global.exit !== true) {
        answers = await rl.question(getPrompt());

        // The newline is added back since it affects lexer behavior around comments and debug information.
        answers += "\n";

        let out;
        let retry = false;
        try {
            out = await db.query(answers, { accept_carry: true, random_seed: opts.random_seed });
        } catch (err) {
            if (err instanceof SyntaxError) {
                db.clearCarry();
            } else if (!(err instanceof ClientSideServerError)) {
                throw err;
            }
            error_handler.handle(err);
            retry = true;
        }

        if (!retry && !isEmpty(out)) {
            out = Tridy.stringify(out);

            console.log(out);
        }
    }

    rl.close();
}
