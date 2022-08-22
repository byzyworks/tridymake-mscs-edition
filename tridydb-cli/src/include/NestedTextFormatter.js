import * as common   from '../utility/common.js';
import { StateTree } from '../utility/StateTree.js';

export class NestedTextFormatter {
    constructor() { }

    static _convertModule(input, alias) {
        let output = '';

        let outer = input.enterGetAndLeave(alias.state);
        if (outer !== undefined) {
            outer = (common.isObject(outer)) ? JSON.stringify(outer, null, 0) : String(outer);
        }

        input.traverse(() => {
            const inner = this._convertModule(input, alias);

            /**
             * Note: if free is undefined for a parent module, just combine the free modules of its children.
             * Otherwise, if free is not undefined for it, then the children act as compounding replacers.
             * That is to say that there is an intentional exception here to the nested behavior.
             */
            if (outer === undefined) {
                output += inner;
            } else {
                let key = input.enterGetAndLeave(alias.type);
                if (key !== undefined) {
                    key   = (common.isObject(key)) ? JSON.stringify(key, null, 0) : String(key);
                    key   = new RegExp(key, 'g');
                    outer = outer.replace(key, inner);
                }
            }
        });
        if (outer !== undefined) {
            output += outer;
        }
        
        return output;
    }

    static convert(input, alias) {
        let output = '';

        if (common.isArray(input)) {
            for (const module of input) {
                output += this._convertModule(new StateTree(module), alias);
            }
        } else if (common.isDictionary(input)) {
            output = this._convertModule(new StateTree(input), alias);
        }

        return output;
    }
}