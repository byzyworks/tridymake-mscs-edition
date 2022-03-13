import { parser as inputParser } from './InputParser.js';

class VMDL {
    constructor() {
        this.parser = inputParser;
    }

    parse(input) {
        this.parser.load(input);
        let tree = this.parser.parse();

        console.log(JSON.stringify(tree));
    }

    carryIsEmpty() {
        return this.parser.carryIsEmpty();
    }
}

export let vmdl = new VMDL();
