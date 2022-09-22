import * as common from '../utility/common.js';

export class XMLFormatter {
    constructor() { }

    static _convertObject(input, root_key, this_key) {
        const output = [ ];

        const wrapper = {
            type:     'element',
            name:     this_key,
            elements: output
        };

        // "_format = xml" is added by the Syntax Parser to symbolize everything under "elements" for the object is pre-parsed.
        if (input._format === 'xml') {
            delete input._format;

            if (common.isArray(input.elements)) {
                /**
                 * "root" tags are automatically generated for the input by the syntax parser.
                 * This allows multiple elements to be inputted without forcing a root tag to also be provided by the user.
                 * Remember that what's being provided as raw input is likely only part of a document, not a full document.
                 * Tridy already provides its own "root elements", like the free data structure's key.
                 */
                if ((input.elements.length === 1) && common.isArray(input.elements[0].elements)) {
                    for (const elem of input.elements[0].elements) {
                        output.push(elem);
                    }
                }
            }

            if (common.isObject(input.unparsed)) {
                for (const key of Object.keys(input.unparsed)) {
                    const raw = this._convertObject(input.unparsed[key], root_key, key);
                    if (common.isArray(input.unparsed[key])) {
                        for (const elem of raw.elements) {
                            output.push(elem);
                        }
                    } else {
                        output.push(raw);
                    }
                }
            }
        } else if (common.isObject(input)) {
            if (common.isEmpty(input)) {
                /**
                 * This prevents the XML parser from turning empty objects into self-closing tags.
                 * The XML parser library has its own option to do this (prevents interpreting [ ] or { } as such).
                 * However, only this method limits itself from reaching inside of pre-parsed XML created through Tridymake.
                 * As a result, it won't alter self-closing tags if the user entered them that way as raw XML.
                 * The third-party XML parser is not smart enough to detect that on its own.
                 */
                output.push({
                    type: 'text',
                    text: ''
                });
            } else {
                for (let child_key in input) {
                    const idx = common.isArray(input) ? this_key : child_key;
    
                    const raw = this._convertObject(input[child_key], root_key, idx);
                    if (common.isArray(input[child_key])) {
                        for (const elem of raw.elements) {
                            output.push(elem);
                        }
                    } else {
                        output.push(raw);
                    }
                }
            }
        } else {
            output.push({
                type: 'text',
                text: input
            });
        }

        return wrapper;
    }

    static convert(input, root_key, response_key) {
        input = common.deepCopy(input);

        const output = [ ];

        const wrapper = {
            declaration: {
                attributes: {
                    version:  '1.0',
                    encoding: 'utf8'
                }
            },
            elements: [
                {
                    type:     'element',
                    name:     root_key,
                    elements: output
                }
            ]
        };

        let raw = this._convertObject(input, root_key, response_key);
        for (const mod of raw.elements) {
            output.push(mod);
        }

        if (output.length === 1) {
            wrapper.elements = output;
        }

        return wrapper;
    }
}