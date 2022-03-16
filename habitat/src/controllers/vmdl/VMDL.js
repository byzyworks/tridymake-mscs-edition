import { parser as inputParser } from './InputParser.js';
import { SyntaxError }           from '../../utility/error.js';
import { logger }                from '../../utility/logger.js';

class VMDL {
    constructor() {
        this.parser = inputParser;
    }

    parse(input, opts) {
        this.parser.load(input);
        let tree = this.parser.parse(opts);

        return tree;
    }

    carryIsEmpty() {
        return this.parser.carryIsEmpty();
    }
}

export const vmdl = new VMDL();
