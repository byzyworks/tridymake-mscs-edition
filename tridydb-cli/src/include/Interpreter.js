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

import { global, deepOverlay, isEmpty }       from '../utility/common.js';
import { SyntaxError, ClientSideServerError } from '../utility/error.js';

const sendTridyRequest = async (data) => {
    try {
        const out = await axios({
            headers: {
                'User-Agent': 'Axios 0.26.1',
                'Content-Type': 'application/json'
            },
            method: 'put',
            url: 'http://' + global.remote.host + ':' + global.remote.port,
            params: {
                type: 'astree',
                data: data
            },
            timeout: global.remote.timeout
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
     * @param   {String}  input               Tridy command(s)/statement(s).
     * @param   {Boolean} opts.tokenless      Used for internal control flow where it's better to send a pre-processed abstract syntax tree directly as input. Default is false.
     * @param   {Boolean} opts.accept_carry   True to statefully retain tokens from incomplete statements, false to throw SyntaxError if receiving an incomplete statement. Default is false.
     * @param   {Boolean} opts.stringify      True to convert the JSON object to a string on output, false to output a JSON object directly (use this if you want to do your own transformations). Default is false.
     * @param   {Boolean} opts.alias.tags     The key under which tags are imported and exported as. Default is 'tags'.
     * @param   {Boolean} opts.alias.state    The key under which the free data structure is imported and exported as. Default is 'free'.
     * @param   {Boolean} opts.alias.nested   The key under which the free data structure is imported and exported as. Default is 'tree'.
     * @param   {Boolean} opts.remote.host    Server to connect to. If not given, then a temporary local (not localhost) session is created.
     * @param   {Boolean} opts.remote.port    Port to connect to, if a host is provided. Default is 21780.
     * @param   {Boolean} opts.remote.timeout Timeout period (in milliseconds) to wait for responses, if a host is provided. Default is 3000.
     * @param   {Boolean} opts.output.pretty  True to output the JSON string with indentation (4-spaced), false to output the JSON in a compressed format. Only works if opts.stringify is enabled. Default is false.
     * @returns {(Array<Object> | String)}    The output of the statement(s).
     * @throws  {SyntaxError}                 Thrown if the input isn't valid Tridy code.
     * @throws  {ClientSideServerError}       Thrown if the server host (optional) sends back an error response.
     */
    async query(input, opts = { }) {
        opts.tokenless    = opts.tokenless    ?? false;
        opts.accept_carry = opts.accept_carry ?? false;
        opts.stringify    = opts.stringify    ?? false;

        if (!isEmpty(opts.alias)) {
            deepOverlay(global.alias, opts.alias);
        }
        if (!isEmpty(opts.remote)) {
            deepOverlay(global.remote, opts.remote);
        }
        if (!isEmpty(opts.output)) {
            deepOverlay(global.output, opts.output);
        }

        let output = [ ];

        if (!opts.tokenless) {
            this._tokenizer.load(input);
        }

        let code;
        if (opts.tokenless) {
            code = new StateTree(JSON.parse(input));

            if (global.remote.host === null) {
                code = this._composer.compose(code);
            } else {
                code = await sendTridyRequest(code.getRaw());
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

                if (global.remote.host === null) {
                    code = this._composer.compose(code);
                } else {
                    code = await sendTridyRequest(code.getRaw());
                }

                for (const part of code) {
                    output.push(part);
                }
            }
        }
        
        /**
         * The output is stringified even if "stringified" is false. That is done on purpose.
         * We'd like to perform the replace() calls whether we return a string or not, but this function can only operate on strings.
         * The replace calls are necessary for the output to contain odd-numbered literal backslashes.
         * These are required to be escaped (i.e. doubled) in the input, but have to be mapped back on output.
         * We can try to deep-modify the object alternatively, but both the keys and values need to be affected.
         */
        if (global.output.pretty) {
            output = JSON.stringify(output, null, 4).replace(/\\\\/g, '\\');
        } else {
            output = JSON.stringify(output).replace(/\\\\/g, '\\');
        }
        
        if (opts.stringify) {
            return output;
        } else {
            return JSON.parse(output);
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
