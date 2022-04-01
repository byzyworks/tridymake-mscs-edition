import { composer }            from './Composer.js';
import { parser }              from './SyntaxParser.js';
import { parser as tokenizer } from './StatementParser.js';

class Interpreter {
    constructor() {
        this.tokenizer = tokenizer;
        this.parser    = parser;
        this.composer  = composer;
    }

    async parse(input, opts) {
        const output = [ ];

        this.tokenizer.load(input);

        let piped;
        while (piped = this.tokenizer.next(opts)) {
            piped = this.parser.parse(piped, opts);
            piped = this.composer.compose(piped, opts);

            for (const part of piped) {
                output.push(part);
            }
        }

        return output;
    }
}

export const interpreter = new Interpreter();
