import { composer }              from './Composer.js';
import { parser as inputParser } from './InputParser.js';

class Interpreter {
    constructor() {
        this.parser   = inputParser;
        this.composer = composer;
    }

    async parse(input, opts) {
        let tree;

        this.parser.load(input);
        tree = this.parser.parse(opts);

        this.composer.load(tree);
        tree = this.composer.compose();

        return tree;
    }

    clearASTree() {
        this.parser.clear();
    }

    carryIsEmpty() {
        return this.parser.carryIsEmpty();
    }
}

export const interpreter = new Interpreter();
