import express         from 'express';
import { StatusCodes } from 'http-status-codes';

import { tridy } from '../include/Interpreter.js';

import { SyntaxError, ServerSideServerError } from '../utility/error.js';
import { logger }                             from '../utility/logger.js';

const op_map = Object.freeze({
    get:    'get',
    post:   'new',
    put:    'set',
    delete: 'del'
});

const toTridy = (op, opts = { }) => {
    // Yes, this is vulnerable to injection. No, don't use this except locally.
    // At the very least treat the port for this like you would any other database port.

    let cmd;

    if ((opts.format === 'verb') || (opts.format === 'astree')) {
        cmd = opts.data;
    } else {
        cmd = '';

        if (opts.context) {
            cmd += `@in ${opts.context} `;
        }
    
        cmd += `@${op}`;
    
        if ((op !== 'get') && (op !== 'del')) {
            switch (opts.format) {
                case 'mod':
                    if (opts.type) {
                        cmd += ` @of "${opts.type}"`;
                    }
    
                    if (opts.tags) {
                        cmd += ` @as ${opts.tags.replace(/,/g, ' ')}`;
                    }
                
                    if (opts.state) {
                        switch (opts.stateformat) {
                            case 'string':
                                cmd += ` @is "${opts.state}"`;
                                break;
                            case 'dynamic':
                                cmd += ` @is \`${opts.state}\``;
                                break;
                            default:
                                cmd += ` @is @${opts.stateformat} ${opts.state} @end`;
                                break;
                        }
                    }
    
                    /**
                     * Note that there isn't a place for '@has' nested statements.
                     * This feature was removed because it would just create a lot of odd-looking query strings.
                     * The main, unnested part of the statement would be structured to use HTTP query parameters, while the nested statements would have to put in as strings of raw Tridy code.
                     * In other words, allowing nested statement would only make the syntax unwieldy and inconsistent for the REST methodology.
                     * Attempting to force the syntax of nested statements as HTTP query parameters would technically entail multiple statements with identical parameter keys.
                     * That means having to develop a system that would make each parameter key (or subvalue, if all packed into one parameter) unique and also associable to the correct statement.
                     * The problem with that, of course, is that modules can get infinitely large and infinitely deep, as can the degree of nested statements there are in one, unnested statement.
                     * Put simply, I don't think it's worth it when there's an alternative, which is to simply provide a way for statements to be entered fully as strings of raw Tridy code (in "verbatim mode").
                     * "Verbatim mode" includes sending the entire statement as Tridy code, not just the nested part.
                     * However, most of the time, '@has' is not necessary to use to begin with, and can be completely avoided with effective tagging.
                     */

                    break;
                case 'string':
                    cmd += ` "${opts.data}"`;
                    break;
                case 'dynamic':
                    cmd += ` \`${opts.data}\``;
                    break;
                default:
                    cmd += ` @${opts.format} ${opts.data} @end`;
                    break;
            }
        } else if (op === 'get') {
            switch (opts.compression) {
                case 0:
                    cmd += ` @raw`;
                    break;
                case 1:
                    cmd += ` @typeless`;
                    break;
                case 2:
                    cmd += ` @tagless`;
                    break;
                case 3:
                    cmd += ` @trimmed`;
                    break;
                case 4:
                    cmd += ` @merged`;
                    break;
                case 5:
                    cmd += ` @final`;
                    break;
            }
        }

        if (opts.greedy) {
            cmd += ` @once`;
        }

        cmd += ';';
    }

    if (opts.format === 'astree') {
        logger.debug(`Received Tridy syntax: ${cmd}`);
    } else {
        logger.debug(`Received Tridy statements: ${cmd}`);
    }

    return cmd;
}

const getOpts = (req, res) => {
    const opts = { };

    if (req.query.context) {
        opts.context = req.query.context;
    }
    if (req.query.greedy) {
        opts.greedy = req.query.greedy;
    }
    if (req.query.compression) {
        opts.compression = req.query.compression;
    }

    if (req.query.format && (req.query.format !== 'mod')) {
        opts.format = req.query.format;
        opts.data   = req.query.data;
    } else {
        opts.format      = 'mod';
        opts.type        = req.query.type;
        opts.tags        = req.query.tags;
        opts.stateformat = req.query.freeformat;
        opts.state       = req.query.free;
    }

    return opts;
}

const handleRoute = async (method, req, res, next) => {
    const opts = getOpts(req, res);

    /**
     * "Verbatim mode" is where commands can be entered directly as Tridy code, bypassing the need for additional HTTP query parameters.
     * It is the only way to send a Tridy command to the server that contains nested statements.
     * Since a snippet of code like this can contain any number of statements, and thus, any number of operations in it, nested or otherwise, in the form of a script,
     * there is effectively no RESTful analog for the multiple commands enterable in verbatim mode, and as such, verbatim mode requires the PUT method.
     * PUT is used because it is generally accepted to be the most powerful, and also potentially the most dangerous of the available methods (thus likely to have access controls).
     * 
     * Abstract syntax tree ('astree') mode is effectively the same, except the code is sent directly in its a pre-processed form.
     * This is the mode of operation used by the console when acting as a client.
     * This way, tokenization and carry can be offloaded to the client, while the server can be left with implementing the AST.
     * The point of this is so carry to be managed the same, intuitive way (locally) in both local and remote console sessions.
     */
    if (((opts.format === 'verb') || (opts.format === 'astree')) && (method !== 'put')) {
        return next(new ServerSideServerError('Only the PUT method is allowed when sending commands to a Tridy server in verbatim mode.', null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false }));
    }

    const cmd = toTridy(op_map[method], opts);

    let out;
    try {
        // We do not want to accept carry on the server-side since managing token carry is the client's job.
        // However, it makes no difference if the client sends a syntax tree directly.
        out = await tridy.query(cmd, {
            tokenless:    opts.format === 'astree',
            accept_carry: false
        });
    } catch (err) {
        if (err instanceof SyntaxError) {
            return next(new ServerSideServerError('The previous request contains unusable input.', err, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false, is_wrapper: true }));
        }
        throw err;
    }

    res.json(out);
}

export const routes = express.Router();

routes.get(   '/', async (req, res, next) => await handleRoute('get', req, res, next));
routes.post(  '/', async (req, res, next) => await handleRoute('post', req, res, next));
routes.put(   '/', async (req, res, next) => await handleRoute('put', req, res, next));
routes.delete('/', async (req, res, next) => await handleRoute('delete', req, res, next));
