/**
 * TridyDB interpreter and TridyDB CLI exported module.
 * 
 * @module
 */

import { composer }            from './Composer.js';
import { parser }              from './SyntaxParser.js';
import { parser as tokenizer } from './StatementParser.js';

import { global, overlay } from '../utility/common.js';
import { SyntaxError }     from '../utility/error.js';

/**
 * Interpreter class for Tridy commands/statements.
 * 
 * A Tridy interpreter includes three parts: a tokenizer, parser, and composer.
 * Each may be stateful to varying degrees.
 * 
 * Interacting with this class is all done through the query() method, which automatically pipes the input through these separate components in order.
 * 
 * @class
 * @property {StatementParser} _tokenizer Extracts tokens from the input string, and manages statement-queuing.
 * @property {SyntaxParser}    _parser    Processes tokens into an abstract syntax tree.
 * @property {Composer}        _composer  Maintains and appends an object database using instructions received from the parser.
 */
class Interpreter {
    constructor() {
        this._tokenizer = tokenizer;
        this._parser    = parser;
        this._composer  = composer;
    }

    /**
     * Interprets a string containing one or more Tridy commands and outputs the results in a JSON object format.
     * 
     * @public
     * @method
     * @param   {String}  input             Tridy command(s)/statement(s).
     * @param   {Boolean} opts.accept_carry True to statefully retain tokens from incomplete statements, false to throw SyntaxError if receiving an incomplete statement. Default is false.
     * @param   {Boolean} opts.stringify    True to convert the JSON object to a string on output, false to output a JSON object directly (use this if you want to do your own transformations). Default is false.
     * @param   {Boolean} opts.pretty       True to output the JSON string with indentation (4-spaced), false to output the JSON in a compressed format. Only works if opts.stringify is enabled. Default is false.
     * @param   {Boolean} opts.alias.tags   The key under which tags are imported and exported as. Default is 'tags'.
     * @param   {Boolean} opts.alias.state  The key under which the free data structure is imported and exported as. Default is 'free'.
     * @param   {Boolean} opts.alias.nested The key under which the free data structure is imported and exported as. Default is 'tree'.
     * @returns {(Array<Object> | String)}  The output of the statement(s).
     * @throws  {SyntaxError}               Thrown if the input isn't valid Tridy code.
     */
    query(input, opts = { }) {
        opts.accept_carry = opts.accept_carry ?? false;
        opts.stringify    = opts.stringify    ?? false;
        opts.pretty       = opts.pretty       ?? false;

        // Make sure the default values for alias are initialized here as well as in the program arguments.
        // If used as a module, then the program arguments won't be accessed, why is why to do it here too.
        global.alias        = global.alias        ?? { };
        global.alias.tags   = global.alias.tags   ?? 'tags';
        global.alias.state  = global.alias.state  ?? 'free';
        global.alias.nested = global.alias.nested ?? 'tree';
        if (opts.alias !== undefined) {
            overlay(global.alias, opts.alias);
        }

        const output = [ ];

        this._tokenizer.load(input);

        let piped;
        while (piped = this._tokenizer.next({ accept_carry: opts.accept_carry })) {
            piped = this._parser.parse(piped);
            piped = this._composer.compose(piped);

            for (const part of piped) {
                output.push(part);
            }
        }

        // The replace() calls are required because of how the JSON parser handles backslashes as literal input.
        if (opts.stringify) {
            if (opts.pretty) {
                return JSON.stringify(output, null, 4).replace(/\\\\/g, '\\');
            } else {
                return JSON.stringify(output).replace(/\\\\/g, '\\');
            }
        } else {
            return output;
        }
    }
}

/**
 * Singleton export of a TridyDB interpreter instance.
 * 
 * @public
 * @constant
 * @static
 * @type {Interpreter}
 */
export const tridy = new Interpreter();
