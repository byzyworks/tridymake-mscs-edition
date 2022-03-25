import fs from 'fs';

import { parser as inputParser } from './InputParser.js';
import { compositor }            from './Compositor.js';

class VMDL {
    constructor() {
        this.parser     = inputParser;
        this.compositor = compositor;
    }

    async load() {
        if (!this.compositor.isLoaded()) {
            this.compositor.loadInit();
        }
    }

    async parse(input, opts) {
        let tree;

        this.parser.load(input);
        tree = this.parser.parse(opts);

        this.compositor.loadCommands(tree);
        tree = this.compositor.compose();

        return tree;
    }

    clearASTree() {
        this.parser.clear();
    }

    carryIsEmpty() {
        return this.parser.carryIsEmpty();
    }
}

export const vmdl = new VMDL();
