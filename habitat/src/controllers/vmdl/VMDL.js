import { parser as inputParser } from './InputParser.js';

class VMDL {
    constructor() {
        this.parser = inputParser;
    }

    parse(input, opts) {
        this.parser.load(input);

        let tree;
        try {
            tree = this.parser.parse(opts);
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.error(err.message);
                if (err.stack) {

                }
            } else {
                throw err;
            }
        }

        return tree;
    }

    carryIsEmpty() {
        return this.parser.carryIsEmpty();
    }
}

export const vmdl = new VMDL();
