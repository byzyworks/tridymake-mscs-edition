import { parser as inputParser } from './InputParser.js';
//import { compositor }            from './Compositor.js';

class VMDL {
    constructor() {
        this.parser     = inputParser;
        //this.compositor = compositor;
    }

    parse(input, opts) {
        let tree;

        this.parser.load(input);
        tree = this.parser.parse(opts);

        //this.compositor.load(tree);
        //tree = this.compositor.parse(tree);

        return tree;
    }

    carryIsEmpty() {
        return this.parser.carryIsEmpty();
    }
}

export const vmdl = new VMDL();
