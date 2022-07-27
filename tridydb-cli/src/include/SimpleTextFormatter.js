import * as common   from '../utility/common.js';
import { StateTree } from '../utility/StateTree.js';

export class SimpleTextFormatter {
    constructor() { }

    static _indent(input, lvl, indent) {
        if (indent < 0) {
            return input;
        }
        return ' '.repeat(lvl * indent) + input;
    }

    static _convertModule(input, alias, output, lvl, indent) {
        input.traverse(() => {
            const type  = input.enterGetAndLeave(alias.type);
            const value = input.enterGetAndLeave(alias.state);
            const mod   = type + value;

            if (!common.isObject(value)) {
                output.push(this._indent(String(mod), lvl, indent));
                if (indent >= 0) {
                    output.push("\n");
                }
            }

            this._convertModule(input, output, lvl + 1, indent);
        });
    }

    static convert(input, alias, opts = { }) {
        opts.indent = opts.indent ?? -1;

        let output = '';

        const strings = [ ];

        if (common.isArray(input)) {
            for (const module of input) {
                this._convertModule(new StateTree(module), alias, strings, 0, opts.indent);
            }
        } else if (common.isDictionary(input)) {
            this._convertModule(new StateTree(input), alias, strings, 0, opts.indent);
        }

        let length = strings.length;
        if (opts.indent >= 0) {
            length--; // skips the last newline, if it exists.
        }
        for (let i = 0; i < length; i++) {
            output += strings[i];
        }

        return output;
    }
}