/**
 * TridyDB interpreter and TridyDB CLI exported module.
 * 
 * @module
 */

import axios from 'axios';

import { composer }            from './Composer.js';
import { parser }              from './SyntaxParser.js';
import { parser as tokenizer } from './StatementParser.js';
import { StateTree }           from './StateTree.js';

import { global }                             from '../utility/common.js';
import { SyntaxError, ClientSideServerError } from '../utility/error.js';

const sendTridyRequest = async (data, host, port, timeout) => {
    try {
        const out = await axios({
            headers: {
                'User-Agent': 'Axios 0.26.1',
                'Content-Type': 'application/json'
            },
            method: 'put',
            url: 'http://' + host + ':' + port,
            params: {
                type: 'astree',
                data: data
            },
            timeout: timeout
        });

        return out.data;
    } catch (err) {
        if (err.response) {
            throw new ClientSideServerError(err.response.data);
        } else {
            throw new ClientSideServerError();
        }
    }
}

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
     * @async
     * @public
     * @method
     * @param   {String}  input             Tridy command(s)/statement(s).
     * @param   {Boolean} opts.tokenless    Used for internal control flow where it's better to send a pre-processed abstract syntax tree directly as input. Default is false.
     * @param   {Boolean} opts.accept_carry True to statefully retain tokens from incomplete statements, false to throw SyntaxError if receiving an incomplete statement. Default is false.
     * @param   {Boolean} opts.host         Server to connect to. If not given, then a temporary local (not localhost) session is created.
     * @param   {Boolean} opts.port         Port to connect to, if a host is provided. Default is 21780.
     * @param   {Boolean} opts.timeout      Timeout period (in milliseconds) to wait for responses, if a host is provided. Default is 3000.
     * @param   {Boolean} opts.tags_key     The key under which tags are imported and exported as. Default is 'tags'.
     * @param   {Boolean} opts.free_key     The key under which the free data structure is imported and exported as. Default is 'free'.
     * @param   {Boolean} opts.tree_key     The key under which the free data structure is imported and exported as. Default is 'tree'.
     * @returns {Array<Object>}             The output of the statement(s).
     * @throws  {SyntaxError}               Thrown if the input isn't valid Tridy code.
     * @throws  {ClientSideServerError}     Thrown if the server host (optional) sends back an error response.
     */
    async query(input, opts = { }) {
        opts.tokenless    = opts.tokenless    ?? false;
        opts.accept_carry = opts.accept_carry ?? false;
        opts.host         = opts.host         ?? global.defaults.remote.host;
        opts.port         = opts.port         ?? global.defaults.remote.port;
        opts.timeout      = opts.timeout      ?? global.defaults.remote.timeout;

        global.alias        = global.alias  ?? { };
        global.alias.tags   = opts.tags_key ?? global.alias.tags   ?? global.defaults.alias.tags;
        global.alias.state  = opts.free_key ?? global.alias.state  ?? global.defaults.alias.state;
        global.alias.nested = opts.tree_key ?? global.alias.nested ?? global.defaults.alias.nested;

        let output = [ ];

        if (!opts.tokenless) {
            this._tokenizer.load(input);
        }

        let code;
        if (opts.tokenless) {
            code = new StateTree(JSON.parse(input));

            if (opts.host === null) {
                code = this._composer.compose(code);
            } else {
                code = await sendTridyRequest(code.getRaw(), opts.host, opts.port, opts.timeout);
            }

            for (const part of code) {
                output.push(part);
            }
        } else {
            while (code = this._tokenizer.next({ accept_carry: opts.accept_carry })) {
                // The two tokens are the clause and the semicolon.
                if (code.length() === 2) {
                    if (code.peek().is('key', 'clear')) {
                        output = [ ];
                        console.clear();
                    } else if (code.peek().is('key', 'exit')) {
                        global.exit = true;
                        break;
                    }
                }

                code = this._parser.parse(code);

                if (opts.host === null) {
                    code = this._composer.compose(code);
                } else {
                    code = await sendTridyRequest(code.getRaw(), opts.host, opts.port, opts.timeout);
                }

                for (const part of code) {
                    output.push(part);
                }
            }
        }

        return output;
    }

    /**
     * Converts the JSON output of tridy.parse() or tridy.objectify() to a string (accounting for escaped backslashes).
     * 
     * @public
     * @method
     * @param   {Object}  input       Tridy JSON output.
     * @param   {Boolean} opts.pretty True to output the JSON string with indentation (4-spaced), false to output the JSON in a compressed format. Default is false.
     * @returns {String}              Input object as a JSON string.
     */
    stringify(input, opts = { }) {
        opts.pretty = opts.pretty ?? global.defaults.output.pretty;

        if (opts.pretty) {
            return JSON.stringify(input, null, 4).replace(/\\\\/g, '\\');
        } else {
            return JSON.stringify(input).replace(/\\\\/g, '\\');
        }
    }

    /**
     * Converts the string output of tridy.stringify() back to a JSON (accounting for escaped backslashes).
     * 
     * @public
     * @method
     * @param   {String} input Tridy JSON string output.
     * @returns {Object}       Input string as a JSON object.
     */
    objectify(input) {
        return JSON.parse(input.replace(/\\/g, '\\\\'));
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
