/**
 * TridyDB database class and TridyDB CLI exported module.
 * 
 * @module
 */

import axios     from 'axios';

import { Composer }        from './Composer.js';
import { Formatter }       from './Formatter.js';
import { SyntaxParser }    from './SyntaxParser.js';
import { StatementParser } from './StatementParser.js';
import { StateTree }       from './StateTree.js';

import * as common                            from '../utility/common.js';
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
    constructor(opts = { }) {
        this._tokenizer = new StatementParser();
        this._parser    = new SyntaxParser();
        this._composer  = new Composer();
    }

    /**
     * Returns the database's current random seed.
     * 
     * @public
     * @method
     * @returns {any} The current random seed.
     */
    getRandomSeed() {
        return this._composer.getRandomSeed();
    }

    /**
     * Sets (or resets) the random seed used by the database.
     * If the same seed as the current one is passed, then only the nonce is reset.
     * Passing null or undefined causes a new seed to be generated randomly.
     * 
     * @public
     * @method
     * @param {any} seed Random seed to use with @random or @shuffled.
     */
    setRandomSeed(seed) {
        this._composer.setRandomSeed(seed);
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
     * @param   {String}  opts.host         Server to connect to (only applies if standalone is false). Default is localhost.
     * @param   {Number}  opts.port         Port to connect to (only applies if standalone is false). Default is 21780.
     * @param   {Number}  opts.timeout      Timeout period (in milliseconds) to wait for responses (only applies if standalone is false). Default is 3000.
     * @param   {String}  opts.type_key     The key used to classify modules when printing compressed output using @merged or @final. Default is 'type'.
     * @param   {String}  opts.tags_key     The key under which tags are imported and exported as. Has no effect if client_mode is enabled. Default is 'tags'.
     * @param   {String}  opts.free_key     The key under which the free data structure is imported and exported as. Has no effect if client_mode is enabled. Default is 'free'.
     * @param   {String}  opts.tree_key     The key under which the tree data structure is imported and exported as. Has no effect if client_mode is enabled. Default is 'tree'.
     * @returns {Array<Object>}             The output of the statement(s).
     * @throws  {SyntaxError}               Thrown if the input isn't valid Tridy code.
     * @throws  {ClientSideServerError}     Thrown if the server host (optional) sends back an error response.
     */
    async query(input, opts = { }) {
        opts.tokenless    = opts.tokenless    ?? false;
        opts.accept_carry = opts.accept_carry ?? false;

        const alias = {
            type:   opts.type_key ?? common.global.alias.type   ?? common.global.defaults.alias.type,
            tags:   opts.tags_key ?? common.global.alias.tags   ?? common.global.defaults.alias.tags,
            state:  opts.free_key ?? common.global.alias.state  ?? common.global.defaults.alias.state,
            nested: opts.tree_key ?? common.global.alias.nested ?? common.global.defaults.alias.nested
        };

        const remote = {
            enable:  opts.client_mode ?? common.global.remote.enable  ?? common.global.defaults.remote.enable,
            host:    opts.host        ?? common.global.remote.host    ?? common.global.defaults.remote.host,
            port:    opts.port        ?? common.global.remote.port    ?? common.global.defaults.remote.port,
            timeout: opts.timeout     ?? common.global.remote.timeout ?? common.global.defaults.remote.timeout
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
                        common.global.exit = true;
                        break;
                    }
                }

                code = this._parser.parse(code);
                if (common.isEmpty(code.getRaw())) {
                    continue;
                }

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
     * Note query() returns an array. In this case, the individual elements should be sent as 'input'.
     * 
     * @public
     * @static
     * @method
     * @param   {Array<Object>} input             Tridy query() JSON output
     * @param   {String}        opts.format       Default format to export the JSON output in. Options are 'json', 'yaml', or 'xml'. Default is 'json'.
     * @param   {Number}        opts.indent       Default indent increment size in spaces to output with. Default is 4 spaces except for YAML, where it is 2 spaces. Passing a non-positive number disables indentation as well as newlines in the output (except for YAML, where 2 spaces is still default).
     * @param   {String}        opts.list_mode    Default way to display output where there is one or multiple modules returned. By default, this is set to 'auto' where single modules are returned alone and multiple module are returned in an array, but there's also 'list_only' and 'items_only' modes.
     * @param   {String}        opts.xml_list_key The name given to the XML list tag. If used with @xml input, a root tag named this is also replaced with its contents. Relevant only when the output format is 'xml'. Default is 'root'.
     * @param   {String}        opts.xml_item_key The name given to the XML individual item tags. Relevant only when the output format is 'xml'. Default is 'tree'.
     * @returns {String | null}                   Input object as a formatted string, or null if it can't be converted to one.
     */
    static stringify(input, opts = { }) {
        opts.format       = (opts.format === 'js') ? 'json' : (opts.format ?? common.global.output.format_str ?? common.global.defaults.output.format_str);
        opts.indent       = opts.indent       ?? common.global.output.indent     ?? common.global.defaults.output.indent;
        opts.list_mode    = opts.list_mode    ?? common.global.output.list_mode  ?? common.global.defaults.output.list_mode;
        opts.xml_list_key = opts.xml_list_key ?? common.global.alias.list        ?? common.global.defaults.alias.list;
        opts.xml_item_key = opts.xml_item_key ?? common.global.alias.nested      ?? common.global.defaults.alias.nested;

        let output = '';
        
        let collect = [ ];
        let list    = [ ];
        let current = null;

        for (let i = 0; i < input.length; i++) {
            const module = input[i].output;

            let last = null;
            if (i > 0) {
                last = input[i - 1].params;
            }

            current              = input[i].params;
            current.format       = (current.format === 'js') ? 'json' : (current.format ?? opts.format);
            current.indent       = current.indent    ?? opts.indent;
            current.list_mode    = current.list_mode ?? opts.list_mode;
            current.xml_list_key = opts.xml_list_key;
            current.xml_item_key = opts.xml_item_key;

            if (!common.isEmpty(list) && (current.list_start || (current.list_mode === 'items_only') || (current.format !== last.format) || (current.indent !== last.indent))) {
                collect.push({ output: list, params: last });
                list = [ ];
            }

            list.push(module);

            if (current.list_end || (current.list_mode === 'items_only')) {
                collect.push({ output: list, params: current });
                list = [ ];
            }
        }

        if (!common.isEmpty(list)) {
            collect.push({ output: list, params: current });
            list = [ ];
        }

        for (let i = 0; i < collect.length; i++) {
            list = collect[i];

            if ((list.params.list_mode === 'list_only') || ((list.params.list_mode === 'auto') && (list.output.length > 1))) {
                output += Formatter.format(list.output, list.params);
                output += '\n';
            } else if ((list.params.list_mode === 'items_only') || ((list.params.list_mode === 'auto') && (list.output.length === 1))) {
                output += Formatter.format(list.output[0], list.params);
                output += '\n';
            }
            
            if (i !== (collect.length - 1)) {
                output += '\n';
            }
        }

        return output;
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
