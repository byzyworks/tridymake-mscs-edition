import * as xml  from 'xml-js';
import * as yaml from 'js-yaml';

import { XMLFormatter } from './XMLFormatter.js';

import * as common from '../utility/common.js';

export class Formatter {
    constructor() { }

    static format(input, opts = { }) {
        opts.format       = opts.format       ?? common.global.output.format ?? common.global.defaults.output.format;
        opts.indent       = opts.indent       ?? common.global.output.indent ?? common.global.defaults.output.indent;
        opts.xml_list_key = opts.xml_list_key ?? common.global.alias.list    ?? common.global.defaults.alias.list;
        opts.xml_item_key = opts.xml_item_key ?? common.global.alias.nested  ?? common.global.defaults.alias.nested;

        switch (opts.format) {
            case 'js':
                return input;
            case 'json':
                opts.indent = opts.indent ?? 4;
                if (Number.isInteger(opts.indent) && (opts.indent >= 0)) {
                    return JSON.stringify(input, null, opts.indent).replace(/\\\\/g, '\\');
                }
                return JSON.stringify(input).replace(/\\\\/g, '\\');
            case 'yaml':
                opts.indent = opts.indent ?? 2;
                if (common.isEmpty(input)) {
                    return '---';
                }
                if (!Number.isInteger(opts.indent) || (opts.indent < 1)) {
                    opts.indent = 2;
                }
                return "---\n" + yaml.dump(input, { indent: opts.indent }).slice(0, -1);
            case 'xml':
                opts.indent = opts.indent ?? 4;
                const converted = XMLFormatter.convert(input, opts.xml_list_key, opts.xml_item_key);
                if (Number.isInteger(opts.indent) && (opts.indent >= 0)) {
                    return xml.js2xml(converted, { compact: false, spaces: opts.indent });
                }
                return xml.js2xml(converted, { compact: false });
            default:
                return null;
        }
    }
}
