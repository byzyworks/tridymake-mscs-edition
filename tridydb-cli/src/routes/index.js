import express         from 'express';
import { StatusCodes } from 'http-status-codes';

import { Tridy }           from '../include/Interpreter.js';
import { TokenlessParser } from '../include/TokenlessParser.js';

import { global, deepCopy, isEmpty }          from '../utility/common.js';
import { SyntaxError, ServerSideServerError } from '../utility/error.js';
import { logger }                             from '../utility/logger.js';

import { db } from '../database.js';

const toTridy = (method, opts = { }) => {
    /**
     * Yes, RESTful mode is potentially vulnerable to injection.
     * Verbatim mode is just RESTful mode that decided to stop caring what you send it.
     * Anything except syntax tree mode should be avoided.
     * Even with it, it's better not to run a TridyDB server except locally.
     * At the very least treat the port for this like you would any other database port.
     */

    let cmd;

    if (opts.format === 'astree') {
        logger.debug(`Received Tridy syntax: ${opts.data}`);

        TokenlessParser.parse(opts.data);

        cmd = opts.data;
    } else if (opts.format === 'verb') {
        cmd = opts.data;
    } else {
        cmd = '';

        if (opts.context !== undefined) {
            cmd += `@in ${opts.context} `;

            if (opts.limit !== undefined) {
                cmd += `@limit ${opts.limit} `;
            }
            if (opts.offset !== undefined) {
                cmd += `@offset ${opts.offset} `;
            }
            if (opts.repeat !== undefined) {
                cmd += `@repeat ${opts.repeat} `;
            }
        }
    
        let op;

        switch (method) {
            case 'get':
                op = 'get';
                break;
            case 'post':
                op = 'new';
                break;
            case 'put':
                switch (opts.mode) {
                    case undefined:
                    case 'overwrite':
                        op = 'set';
                        break;
                    case 'edit':
                        op = 'put';
                        break;
                    case 'tag':
                        op = 'tag';
                        break;
                    case 'untag':
                        op = 'untag';
                        break;
                    default:
                        throw new ServerSideServerError(`Invalid value passed to parameter "mode": "${opts.mode}".`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false });
                }
                break;
            case 'delete':
                op = 'del';
                break;
            default:
                throw new ServerSideServerError(`Invalid method call received: ${method}.`, null, { http_code: StatusCodes.METHOD_NOT_ALLOWED, is_fatal: false });
        }
        
        cmd += `@${op}`;
    
        if ((method !== 'get') && (method !== 'del')) {
            switch (opts.format) {
                case 'mod':
                    if (opts.type !== undefined) {
                        cmd += ` @of "${opts.type}"`;
                    }
    
                    if (opts.tags !== undefined) {
                        cmd += ` @as ${opts.tags}`;
                    }
                
                    if (opts.statedata !== undefined) {
                        switch (opts.stateformat) {
                            case 'string':
                                cmd += ` @is "${opts.statedata}"`;
                                break;
                            case 'dynamic':
                                cmd += ` @is \`${opts.statedata}\``;
                                break;
                            default:
                                cmd += ` @is @${opts.stateformat} % ${opts.statedata} %`;
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
                    cmd += ` @${opts.format} % ${opts.data} %`;
                    break;
            }
        } else if (method === 'get') {
            if (opts.indent) {
                cmd += ` @indent ${opts.indent}`;
            }

            switch (opts.compression) {
                case undefined:
                    break;
                case '0':
                    cmd += ` @raw`;
                    break;
                case '1':
                    cmd += ` @typeless`;
                    break;
                case '2':
                    cmd += ` @tagless`;
                    break;
                case '3':
                    cmd += ` @trimmed`;
                    break;
                case '4':
                    cmd += ` @merged`;
                    break;
                case '5':
                    cmd += ` @final`;
                    break;
                default:
                    throw new ServerSideServerError(`Invalid value passed to parameter "compression": "${opts.compression}".`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false });
            }

            switch (opts.format) {
                case 'json':
                    cmd += ` @json`;
                    break;
                case 'yaml':
                    cmd += ` @yaml`;
                    break;
                case 'xml':
                    cmd += ` @xml`;
                    break;
                default:
                    throw new ServerSideServerError(`Invalid value passed to parameter "format": "${opts.format}".`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false });
            }

            cmd += ` @list`;
        }
        
        cmd += ';';
    }

    if (opts.format !== 'astree') {
        logger.debug(`Received Tridy statements: ${cmd}`);
    }

    return cmd;
}

const handleRoute = async (method, req, res, next) => {
    const opts = deepCopy(req.query);

    opts.format = opts.format ?? 'mod';

    if (opts.format === 'astree') {
        const allow_tree = global.server.allow_tree ?? global.defaults.server.allow_tree;
        if (!allow_tree) {
            return next(new ServerSideServerError(`The server received an syntax tree query even though syntax tree mode is disabled.`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false }));
        }
    } else if (opts.format === 'verb') {
        const allow_verb = global.server.allow_verb ?? global.defaults.server.allow_verb;
        if (!allow_verb) {
            return next(new ServerSideServerError(`The server received a verbatim query even though verbatim mode is disabled.`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false }));
        }
    } else {
        const allow_rest = global.server.allow_rest ?? global.defaults.server.allow_rest;
        if (!allow_rest) {
            return next(new ServerSideServerError(`The server (presumably) received a RESTful query even though RESTful mode is disabled.`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false }));
        }
    }

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

    let cmd;
    let out;

    try {
        cmd = toTridy(method, opts);
    } catch (err) {
        if ((err instanceof SyntaxError) || (err instanceof ServerSideServerError)) {
            return next(err);
        }
    }
    
    try {
        // We do not want to accept carry on the server-side since managing token carry is the client's job.
        // However, it makes no difference if the client sends a syntax tree directly.
        out = await db.query(cmd, {
            tokenless:    opts.format === 'astree',
            accept_carry: false
        });
    } catch (err) {
        if (err instanceof SyntaxError) {
            db.clearCarry();

            return next(new ServerSideServerError('The previous request contains unusable input.', err, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false, is_wrapper: true }));
        }
        throw err;
    }

    const preformat = global.server.preformat ?? global.defaults.server.preformat;
    if (preformat) {
        if (!isEmpty(out)) {
            out = await Tridy.stringify(out);
        }
    
        switch (opts.format) {
            case 'json':
                res.set('Content-Type', 'application/json');
                break;
            case 'yaml':
                res.set('Content-Type', 'application/x-yaml');
                break;
            case 'xml':
                res.set('Content-Type', 'application/xml');
                break;
            default:
                res.set('Content-Type', 'application/text');
                break;
        }
    
        res.send(out);
    } else {
        res.json(out);
    }
}

export const routes = express.Router();

routes.get(   '/', async (req, res, next) => await handleRoute('get',    req, res, next));
routes.post(  '/', async (req, res, next) => await handleRoute('post',   req, res, next));
routes.put(   '/', async (req, res, next) => await handleRoute('put',    req, res, next));
routes.delete('/', async (req, res, next) => await handleRoute('delete', req, res, next));
