/**
 * Tridymake database class and exported module.
 * 
 * @module
 */

import fs from 'fs';

import axios from 'axios';

import { Composer }         from './Composer.js';
import { Formatter }        from './Formatter.js';
import { HTTPMethodParser } from './HTTPMethodParser.js';
import { SyntaxParser }     from './SyntaxParser.js';
import { StatementLexer }   from './StatementLexer.js';

import * as common from '../utility/common.js';
import * as error  from '../utility/error.js';
import { logger }  from '../utility/logger.js';
import { global }  from '../utility/mapped.js';

const parseTridyResponse = (response) => {
    let bad_response = false;

    if (!common.isDictionary(response) || !common.isArray(response.modules) || (!common.isNullish(response.alias) && !common.isDictionary(response.alias))) {
        bad_response = true;
    }
    if (!bad_response) {
        for (const module of response.modules) {
            if (!common.isDictionary(module) || !common.isObject(module.content) || (!common.isNullish(module.params) && !common.isDictionary(module.params))) {
                bad_response = true;
                break;
            }
        }
    }

    if (bad_response) {
        throw new error.SyntaxError(`This client received an badly-formatted response from the server that has been discarded.`);
    }
}

const sendTridyRequest = async (data, remote) => {
    let output;

    try {
        const method = HTTPMethodParser.getLowestPermission(data);
        const out    = await axios({
            headers: {
                'User-Agent': 'Axios 0.26.1',
                'Content-Type': 'application/json'
            },
            method: method,
            url:    'http://' + remote.host + ':' + remote.port,
            params: {
                format: 'tree',
                data:   data
            },
            timeout: remote.timeout
        });

        output = out.data;
    } catch (err) {
        if (err.response) {
            throw new error.ClientSideServerError(err.response.data);
        }
        throw new error.ClientSideServerError();
    }

    parseTridyResponse(output);

    return output;
}

const exportToFile = async (data, filepath, mode, quiet) => {
    switch (mode) {
        case 'create':
            mode = 'ax'; // 'wx' assumptively behaves no different.
            break;
        case 'append':
            mode = 'a';
            break;
        case 'replace':
            mode = 'w';
            break;
        default:
            throw new error.SyntaxError(`Invalid file export mode "${mode}".`);
    }

    let result;
    try {
        result = await fs.promises.writeFile(filepath, data, {
            encoding: 'utf-8',
            flag:     mode,
            mode:     0o755
        });
    } catch (err) {
        if (quiet !== true) {
            error.error_handler.handle(new error.FileError(err.message));
        }
    }

    return result;
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
 * @property {StatementParser} _lexer    Extracts tokens from the input string, and manages statement-queuing.
 * @property {SyntaxParser}    _parser   Processes tokens into an abstract syntax tree.
 * @property {Composer}        _composer Maintains and appends an object database using instructions received from the parser.
 */
export class Tridy {
    /**
     * Constructor for the Tridy class.
     * 
     * @param {String} opts.type_key The key used to classify modules when printing compressed output using @merged or @final. Default is 'type'.
     * @param {String} opts.tags_key The key under which tags are imported and exported as. Has no effect if client_mode is enabled. Default is 'tags'.
     * @param {String} opts.free_key The key under which the free data structure is imported and exported as. Has no effect if client_mode is enabled. Default is 'free'.
     * @param {String} opts.tree_key The key under which the tree data structure is imported and exported as. Has no effect if client_mode is enabled. Default is 'tree'.
     * @param {String} opts.root_key The name given to the XML list tag. If used with @xml input, a root tag named this is also replaced with its contents. Relevant only when the output format is 'xml'. Default is 'root'.
     */
    constructor(opts = { }) {
        const alias = {
            type:   opts.type_key ?? global.alias.type   ?? global.defaults.alias.type,
            tags:   opts.tags_key ?? global.alias.tags   ?? global.defaults.alias.tags,
            state:  opts.free_key ?? global.alias.state  ?? global.defaults.alias.state,
            nested: opts.tree_key ?? global.alias.nested ?? global.defaults.alias.nested,
            list:   opts.list_key ?? global.alias.list   ?? global.defaults.alias.list
        };

        this._lexer    = new StatementLexer();
        this._parser   = new SyntaxParser();
        this._composer = new Composer(alias);
    }

    /**
     * Returns the database's set of aliases.
     * 
     * @public
     * @method
     * @returns {Object} A data structure with each alias mapped to an internal constant.
     */
    getAliases() {
        return this._composer.getAliases();
    }

    /**
     * Sets (or resets) the aliases used by the database.
     * 
     * @public
     * @method
     * @param {Object} aliases A data structure with each alias mapped to an internal constant.
     */
    setAliases(aliases) {
        this._composer.setAliases(aliases);
    }

    /**
     * Returns the database's current random seed.
     * 
     * @public
     * @method
     * @returns {any} The current random seed.
     */
    getRandomSeeds() {
        return this._composer.getRandomSeeds();
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
    setRandomSeeds(seeds) {
        this._composer.setRandomSeeds(seeds);
    }

    /**
     * Interprets a string containing one or more Tridy commands and outputs the results in a JSON object format.
     * 
     * @async
     * @public
     * @method
     * @param   {String | Object} input             Tridy command(s)/statement(s). A string is required unless opts.tokenless is true.
     * @param   {Boolean}         opts.tokenless    Used for internal control flow where it's better to send a pre-processed abstract syntax tree directly as input. Default is false.
     * @param   {Boolean}         opts.accept_carry True to statefully retain tokens from incomplete statements, false to throw SyntaxError if receiving an incomplete statement. Default is false.
     * @param   {Boolean}         opts.interactive  Allows interactive control commands like @clear and @exit to be effective. Default is false.
     * @param   {String}          opts.filepath     Path of the file that is the source of the command(s)/statement(s). Used for debugging. Default is null.
     * @param   {Boolean}         opts.astree_only  Only return the abstract syntax tree; do not attempt to execute it and return the results thereof. Default is false.
     * @param   {Boolean}         opts.client_mode  True to run as a client, false to run standalone / as a server. Default is false.
     * @param   {String}          opts.host         Server to connect to (only applies if standalone is false). Default is localhost.
     * @param   {Number}          opts.port         Port to connect to (only applies if standalone is false). Default is 21780.
     * @param   {Number}          opts.timeout      Timeout period (in milliseconds) to wait for responses (only applies if standalone is false). Default is 3000.
     * @returns {Array<Object>}                     The output of the statement(s), including presentation metadata.
     * @throws  {SyntaxError}                       Thrown if the input isn't valid Tridy code.
     * @throws  {ClientSideServerError}             Thrown if the server host (optional) sends back an error response.
     */
    async query(input, opts = { }) {
        opts.tokenless    = opts.tokenless    ?? false;
        opts.accept_carry = opts.accept_carry ?? false;
        opts.interactive  = opts.interactive  ?? false;
        opts.filepath     = opts.filepath     ?? null;
        opts.astree_only  = opts.astree_only  ?? false;

        const remote = {
            enable:  opts.client_mode ?? global.remote.enable  ?? global.defaults.remote.enable,
            host:    opts.host        ?? global.remote.host    ?? global.defaults.remote.host,
            port:    opts.port        ?? global.remote.port    ?? global.defaults.remote.port,
            timeout: opts.timeout     ?? global.remote.timeout ?? global.defaults.remote.timeout
        };

        let astree;
        let alias;
        let output = [ ];

        if (opts.tokenless) {
            if (common.isObject(input)) {
                astree = input;
            } else {
                try {
                    astree = JSON.parse(input);
                } catch (err) {
                    throw new error.SyntaxError(err.message);
                }
            }

            if (opts.astree_only) {
                return astree;
            }

            if (common.isEmpty(astree)) {
                return output;
            }
    
            let results;
            if (remote.enable) {
                results = await sendTridyRequest(astree, remote);
            } else {
                results = await this._composer.compose(astree);
            }
    
            alias = alias ?? results.alias ?? global.alias ?? global.defaults.alias;
            for (const module of results.modules) {
                output.push(module);
            }
        } else {
            this._lexer.load(input, { filepath: opts.filepath });

            let tokens;
    
            while (tokens = this._lexer.next({ accept_carry: opts.accept_carry })) {
                astree = await this._parser.parse(tokens);
                
                if (global.flags.exit === true) {
                    if ((opts.filepath !== null) || !opts.interactive) {
                        global.flags.exit = false;

                        throw new error.SyntaxError(`The @exit command does not work in non-interactive contexts such as scripts or inside server mode.`);
                    }

                    break;
                }
    
                if (global.flags.clear === true) {
                    global.flags.clear = false;

                    if ((opts.filepath !== null) || !opts.interactive) {
                        throw new error.SyntaxError(`The @clear command does not work in non-interactive contexts such as scripts or inside server mode.`);
                    }

                    output = [ ];
                    console.clear();
    
                    continue;
                }
    
                if (opts.astree_only) {
                    if (!common.isEmpty(astree)) {
                        output.push(astree[global.defaults.alias.nested][0]);
                    }
                } else {
                    if (common.isEmpty(astree)) {
                        continue;
                    }
            
                    let results;
                    if (remote.enable) {
                        results = await sendTridyRequest(astree, remote);
                    } else {
                        results = await this._composer.compose(astree);
                    }

                    alias = alias ?? results.alias ?? global.alias ?? global.defaults.alias;
                    for (const module of results.modules) {
                        output.push(module);
                    }
                }
            }
        }

        if (opts.astree_only) {
            const wrapper = { };
            wrapper[global.defaults.alias.nested] = output;

            return wrapper;
        }

        output = { alias: alias, modules: output };

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
        return this._lexer.isCarrying();
    }

    /**
     * Clears the input buffer, thereby removing any incomplete statements that are being carried.
     * 
     * @public
     * @method
     */
    clearCarry() {
        this._lexer.clear();
    }

    /**
     * Converts the JSON output of query() or objectify() to a string (accounting for escaped backslashes).
     * If there are exported files, this will also output them to the appropriate places.
     * 
     * @public
     * @method
     * @param   {Object}        input           Tridy query() JSON output (presumably).
     * @param   {String}        opts.format     Default format to export the JSON output in. Options are 'json', 'yaml', or 'xml'. Default is 'json'.
     * @param   {Number}        opts.indent     Default indent increment size in spaces to output with. Default is null, which auto-generates 4 spaces except for YAML, where it is 2 spaces, and none for text output. Passing a non-positive number disables indentation as well as newlines in the output (except for YAML, where 1 space is a minimum).
     * @param   {String}        opts.list_mode  Default way to display output where there is one or multiple modules returned. By default, this is set to 'auto' where single modules are returned alone and multiple module are returned in an array, but there's also 'list_only' and 'items_only' modes.
     * @param   {String}        opts.file       Default file to export to. If null, then this is standard output / the console. Default is null. 
     * @param   {String}        opts.file_mode  Default behavior when the file exported to already exists. Options are 'create' (where nothing is done), 'append', and 'replace'. Default is 'create'.
     * @param   {Boolean}       opts.file_quiet Default behavior on whether to throw an error when a file exported to already exists. Default is false (will throw an error).
     * @param   {Boolean}       opts.no_export  Whether to export file-directed output or not. Default is false.
     * @returns {String | null}                 Input object as a formatted string, or null if it can't be converted to one.
     * @throws  {SyntaxError}                   Thrown if some parameters are received incorrectly, either from the method caller or from the server, if there is one.
     */
    async stringify(input, opts = { }) {
        opts.format     = opts.format     ?? global.output.format     ?? global.defaults.output.format;
        opts.indent     = opts.indent     ?? global.output.indent     ?? global.defaults.output.indent;
        opts.list_mode  = opts.list_mode  ?? global.output.list_mode  ?? global.defaults.output.list_mode;
        opts.file       = opts.file       ?? global.output.file.path  ?? global.defaults.output.file.path;
        opts.file_mode  = opts.file_mode  ?? global.output.file.mode  ?? global.defaults.output.file.mode;
        opts.file_quiet = opts.file_quiet ?? global.output.file.quiet ?? global.defaults.output.file.quiet;
        opts.no_export  = opts.no_export  ?? false;

        // 'js' returns an object from Formatter, 'json' returns a string.
        opts.format = (opts.format === 'js') ? 'json' : opts.format;
        
        let stdout = '';

        if (common.isNullish(input.alias)) {
            if (!common.isEmpty(input.modules)) {
                logger.warn(`Aliases were not provided with the input to Tridy.stringify(...). The output of this function may not be correct if the input is from a separate server with different aliases.`);
            }
            
            input.alias = { };
        }
        const local_alias = this.getAliases();
        input.alias = {
            type:   input.alias.type   ?? local_alias.type,
            tags:   input.alias.tags   ?? local_alias.tags,
            state:  input.alias.state  ?? local_alias.state,
            nested: input.alias.nested ?? local_alias.nested,
            list:   input.alias.list   ?? local_alias.list
        };

        /**
         * The order files have relative to each other doesn't matter, while it matters for every other parameter.
         * However, we don't want to cause lists for one file to split on conditions specific to another file, or to standard output.
         * The sorting prevents
         * Hence, commands affecting the same file should be grouped together, while the original order of commands should be maintained otherwise.
         */
        input.modules.sort((a, b) => {
            a.params = a.params ?? { };
            b.params = b.params ?? { };

            a = a.params.file;
            b = b.params.file;

            if (common.isNullish(a) && common.isNullish(b)) {
                return 0;
            }
            if (!common.isNullish(a)) {
                a = a.toLowerCase();
                if (common.isNullish(b)) {
                    return 1;
                }
            }
            if (!common.isNullish(b)) {
                b = b.toLowerCase();
                if (common.isNullish(a)) {
                    return -1;
                }
            }
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
        });

        let collect = [ ];
        let list    = [ ];
        let current = null;

        for (let i = 0; i < input.modules.length; i++) {
            const module = input.modules[i].content;

            let last = null;
            if (i > 0) {
                last = input.modules[i - 1].params;
            }

            current            = input.modules[i].params ?? { };
            current.format     = (current.format === 'js') ? 'json' : (current.format ?? opts.format);
            current.indent     = current.indent     ?? opts.indent;
            current.list_mode  = current.list_mode  ?? opts.list_mode;
            current.file       = current.file       ?? opts.file;
            current.file_mode  = current.file_mode  ?? opts.file_mode;
            current.file_quiet = current.file_quiet ?? opts.file_quiet;
            current.list_nonce = current.list_nonce ?? -1; // The nonces all begin at 0. Defaulting to -1 separates out the 'null' nonces in the output.
            current.stmt_nonce = current.stmt_nonce ?? -1;
            current.alias      = opts.alias;

            if ((current.indent !== null) && ((typeof current.indent !== 'number') || !Number.isInteger(current.indent))) {
                throw new error.SyntaxError(`Invalid indent mode "${indent}".`);
            }

            let changed_parameters = false;
            if (last !== null) {
                if (current.file === null) {
                    changed_parameters ||= ((current.format !== last.format) || (current.indent !== last.indent) || (current.list_nonce !== last.list_nonce));
                } else {
                    // There is only one format / indentation / list output grouping per statement, so it would be redundant to check those here.
                    changed_parameters ||= (current.stmt_nonce !== last.stmt_nonce);
                }
            }

            if (!common.isEmpty(list) && ((current.list_mode === 'items_only') || changed_parameters)) {
                collect.push({ output: list, params: last });
                list = [ ];
            }

            list.push(module);

            if (current.list_mode === 'items_only') {
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

            let output = '';
            if ((list.params.list_mode === 'list_only') || ((list.params.list_mode === 'auto') && (list.output.length > 1))) {
                output += Formatter.format(list.output, list.params);
                output += "\n";
            } else if ((list.params.list_mode === 'items_only') || ((list.params.list_mode === 'auto') && (list.output.length === 1))) {
                output += Formatter.format(list.output[0], list.params);
                output += "\n";
            } else {
                throw new error.SyntaxError(`Invalid list mode "${list.params.list_mode}".`);
            }

            if (list.params.file === null) {
                stdout += output;
            } else if (!opts.no_export) {
                await exportToFile(output, list.params.file, list.params.file_mode, list.params.file_quiet);
            }
        }

        return stdout;
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
            throw new error.SyntaxError(err.message);
        }
    }
}
