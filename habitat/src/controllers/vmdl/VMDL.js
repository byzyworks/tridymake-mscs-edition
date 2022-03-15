import { parser as inputParser } from './InputParser.js';

class VMDL {
    constructor() {
        this.parser = inputParser;
    }

    parse(input, opts) {
        this.parser.load(input);
        const tree = this.parser.parse(opts);

        console.log(JSON.stringify(tree));
    }

    carryIsEmpty() {
        return this.parser.carryIsEmpty();
    }
}

export const vmdl = new VMDL();
