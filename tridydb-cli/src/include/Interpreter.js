/**
 * TridyDB database class and TridyDB CLI exported module.
 * 
 * @module
 */

import axios from 'axios';

import { Composer }        from './Composer.js';
import { SyntaxParser }    from './SyntaxParser.js';
import { StatementParser } from './StatementParser.js';
import { StateTree }       from './StateTree.js';

import { global }                             from '../utility/common.js';
import { SyntaxError, ClientSideServerError } from '../utility/error.js';

const sendTridyRequest = async (data, remote) => {
    try {
        const out = await axios({
            headers: {
                'User-Agent': 'Axios 0.26.1',
                'Content-Type': 'application/json'
            },
            method: 'put',
            url: 'http://' + remote.host + ':' + remote.port,
            params: {
                format: 'astree',
                data: data
            },
            timeout: remote.timeout
        });

        return out.data;
    } catch (err) {
        if (err.response) {
            throw new ClientSideServerError(err.response.data);
        }
        throw new ClientSideServerError();
    }
}

/**
 * Database class for interpreting Tridy commands/statements.
 * 
 * A Tridy database includes three parts: a tokenizer, parser, and composer.
 * Each may be stateful to varying degrees.
 * 
 * Interacting with this class is all done through the query() method, which automatically pipes the input through these separate components in order.
 * 
 * @class
 * @property {StatementParser} _tokenizer Extracts tokens from the input string, and manages statement-queuing.
 * @property {SyntaxParser}    _parser    Processes tokens into an abstract syntax tree.
 * @property {Composer}        _composer  Maintains and appends an object database using instructions received from the parser.
 */
export class Tridy {
    constructor() {
        this._tokenizer = new StatementParser();
        this._parser    = new SyntaxParser();
        this._composer  = new Composer();
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
     * @param   {Boolean} opts.client_mode  True to run as a client, false to run standalone / as a server. Default is false.
     * @param   {Boolean} opts.host         Server to connect to (only applies if standalone is false). Default is localhost.
     * @param   {Boolean} opts.port         Port to connect to (only applies if standalone is false). Default is 21780.
     * @param   {Boolean} opts.timeout      Timeout period (in milliseconds) to wait for responses (only applies if standalone is false). Default is 3000.
     * @param   {Boolean} opts.type_key     The key used to classify modules when printing compressed output using @done. Default is 'type'.
     * @param   {Boolean} opts.tags_key     The key under which tags are imported and exported as. Has no effect if client_mode is enabled. Default is 'tags'.
     * @param   {Boolean} opts.free_key     The key under which the free data structure is imported and exported as. Has no effect if client_mode is enabled. Default is 'free'.
     * @param   {Boolean} opts.tree_key     The key under which the tree data structure is imported and exported as. Has no effect if client_mode is enabled. Default is 'tree'.
     * @returns {Array<Object>}             The output of the statement(s).
     * @throws  {SyntaxError}               Thrown if the input isn't valid Tridy code.
     * @throws  {ClientSideServerError}     Thrown if the server host (optional) sends back an error response.
     */
    async query(input, opts = { }) {
        opts.tokenless    = opts.tokenless    ?? false;
        opts.accept_carry = opts.accept_carry ?? false;

        const alias = {
            type:   opts.type_key ?? global.alias.type   ?? global.defaults.alias.type,
            tags:   opts.tags_key ?? global.alias.tags   ?? global.defaults.alias.tags,
            state:  opts.free_key ?? global.alias.state  ?? global.defaults.alias.state,
            nested: opts.tree_key ?? global.alias.nested ?? global.defaults.alias.nested
        };

        const remote = {
            enable:  opts.client_mode ?? global.remote.client_mode ?? global.defaults.remote.client_mode,
            host:    opts.host        ?? global.remote.host        ?? global.defaults.remote.host,
            post:    opts.post        ?? global.remote.post        ?? global.defaults.remote.post,
            timeout: opts.timeout     ?? global.remote.timeout     ?? global.defaults.remote.timeout
        };

        let output = [ ];

        if (!opts.tokenless) {
            this._tokenizer.load(input);
        }

        let code;
        if (opts.tokenless) {
            try {
                input = JSON.parse(input);
            } catch (err) {
                throw new SyntaxError(err.message);
            }
            code = new StateTree(input);

            if (remote.enable) {
                code = await sendTridyRequest(code.getRaw(), remote);
            } else {
                code = this._composer.compose(code, alias);
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
                        continue;
                    } else if (code.peek().is('key', 'exit')) {
                        global.exit = true;
                        break;
                    }
                }

                code = this._parser.parse(code);

                if (remote.enable) {
                    code = await sendTridyRequest(code.getRaw(), remote);
                } else {
                    code = this._composer.compose(code, alias);
                }

                for (const part of code) {
                    output.push(part);
                }
            }
        }

        return output;
    }

    /**
     * Returns true if this interpreter instance is carrying incomplete statements, false otherwise.
     * 
     * @public
     * @method
     * @returns {Boolean} True if carrying, false if not.
     */
    isCarrying() {
        return this._tokenizer.isCarrying();
    }

    /**
     * Clears the input buffer, thereby removing any incomplete statements that are being carried.
     * 
     * @public
     * @method
     */
    clearCarry() {
        this._tokenizer.clear();
    }

    /**
     * Converts the JSON output of query() or objectify() to a string (accounting for escaped backslashes).
     * 
     * @public
     * @static
     * @method
     * @param   {Object}  input       Tridy JSON output.
     * @param   {Boolean} opts.pretty True to output the JSON string with indentation (4-spaced), false to output the JSON in a compressed format. Default is false.
     * @returns {String}              Input object as a JSON string.
     */
    static stringify(input, opts = { }) {
        opts.pretty = opts.pretty ?? global.defaults.output.pretty;

        if (opts.pretty) {
            return JSON.stringify(input, null, 4).replace(/\\\\/g, '\\');
        }
        return JSON.stringify(input).replace(/\\\\/g, '\\');
    }

    /**
     * Converts the string output of stringify() back to a JSON (accounting for escaped backslashes).
     * 
     * @public
     * @static
     * @method
     * @param   {String} input Tridy JSON string output.
     * @returns {Object}       Input string as a JSON object.
     * @throws  {SyntaxError}  Thrown if the input isn't valid JSON.
     */
    static objectify(input) {
        try {
            return JSON.parse(input.replace(/\\/g, '\\\\'));
        } catch (err) {
            throw new SyntaxError(err.message);
        }
    }
}
