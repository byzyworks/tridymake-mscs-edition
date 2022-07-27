import * as xml  from 'xml-js';
import * as yaml from 'js-yaml';

import { NestedTextFormatter } from './NestedTextFormatter.js';
import { SimpleTextFormatter } from './SimpleTextFormatter.js';
import { XMLFormatter }        from './XMLFormatter.js';

import * as common from '../utility/common.js';

export class Formatter {
    constructor() { }

    static format(input, opts = { }) {
        opts.format = opts.format ?? common.global.output.format ?? common.global.defaults.output.format;
        opts.indent = opts.indent ?? common.global.output.indent ?? common.global.defaults.output.indent;
        opts.alias  = opts.alias  ?? common.global.alias         ?? common.global.defaults.alias;

        switch (opts.format) {
            case 'js':
                return input;
            case 'json':
                opts.indent = opts.indent ?? 4;
                if (Number.isInteger(opts.indent)) {
                    if (opts.indent > 0) {
                        return JSON.stringify(input, null, opts.indent).replace(/\\\\/g, '\\');
                    } else if (opts.indent === 0) {
                        return JSON.stringify(input, null, 1).replace(/\n\s+/g, "\n").replace(/\\\\/g, '\\');
                    }
                }
                return JSON.stringify(input).replace(/\\\\/g, '\\');
            case 'yaml':
                opts.indent = opts.indent ?? 2;
                if (common.isEmpty(input)) {
                    return '---';
                }
                if (!Number.isInteger(opts.indent) || (opts.indent < 1)) {
                    opts.indent = 1;
                }
                return "---\n" + yaml.dump(input, { indent: opts.indent }).slice(0, -1);
            case 'xml':
                opts.indent = opts.indent ?? 4;
                const converted = XMLFormatter.convert(input, opts.alias.list, opts.alias.nested);
                if (Number.isInteger(opts.indent)) {
                    if (opts.indent > 0) {
                        return xml.js2xml(converted, { compact: false, spaces: opts.indent });
                    } else if (opts.indent === 0) {
                        return xml.js2xml(converted, { compact: false, spaces: 1 }).replace(/\n\s+/g, "\n");
                    }
                }
                return xml.js2xml(converted, { compact: false });
            case 'simple-text':
                opts.indent = opts.indent ?? -1;
                return SimpleTextFormatter.convert(input, alias, { indent: opts.indent });
            case 'nested-text':
                return NestedTextFormatter.convert(input, alias);
            default:
                throw new SyntaxError(`Invalid format "${opts.format}".`);
        }
    }
}
