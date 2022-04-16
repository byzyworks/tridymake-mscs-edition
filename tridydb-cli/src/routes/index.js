import express from 'express';

import { interpreter } from '../include/Interpreter.js';

import { alias }       from '../utility/common.js';
import { ServerError } from '../utility/error.js';
import { logger }      from '../utility/logger.js';

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

    if (opts.type === 'verb') {
        cmd = opts.data;
    } else {
        cmd = '';

        if (opts.context) {
            cmd += `@in ${opts.context} `;
        }
    
        cmd += `@${op}`;
    
        if ((op !== 'get') && (op !== 'del')) {
            if (opts.type === 'mod') {
                if (opts.tags) {
                    cmd += ` @as ${opts.tags}`;
                }
            
                if (opts.state) {
                    cmd += ` @is @${opts.statetype} ${opts.state} @end`;
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
            } else {
                cmd += ` @${opts.type} ${opts.data} @end`;
            }
        }

        if (opts.greedy) {
            cmd += `@once `;
        }

        cmd += ';';
    }

    logger.debug(`Generated Tridy command: ${cmd}`);

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

    if (req.query.type && (req.query.type !== 'mod')) {
        opts.type = req.query.type;
        opts.data = req.query.data;
    } else {
        opts.type      = 'mod';
        opts.tags      = req.query[alias.tags];
        opts.statetype = req.query[alias.state + 'type'];
        opts.state     = req.query[alias.state];
    }

    return opts;
}

const handleRoute = async (method, req, res) => {
    const opts = getOpts(req, res);

    /**
     * "Verbatim mode" is where commands can be entered directly as Tridy code, bypassing the need for additional HTTP query parameters.
     * It is the only way to send a Tridy command to the server that contains nested statements.
     * Since a snippet of code like this can contain any number of statements, and thus, any number of operations in it, nested or otherwise, in the form of a script,
     * there is effectively no RESTful analog for the multiple commands enterable in verbatim mode, and as such, verbatim mode requires the PUT method.
     * PUT is used because it is generally accepted to be the most powerful, and also potentially the most dangerous of the available methods (thus likely to have access controls).
     */
    if ((opts.type === 'verb') && (method !== 'put')) {
        throw new ServerError('Only the PUT method is allowed when sending commands to a Tridy server in verbatim mode.', { is_fatal: false });
    }

    const cmd = toTridy(op_map[method], opts);

    const out = interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
}

export const routes = express.Router();

routes.get('/',    async (req, res) => await handleRoute('get', req, res));
routes.post('/',   async (req, res) => await handleRoute('post', req, res));
routes.put('/',    async (req, res) => await handleRoute('put', req, res));
routes.delete('/', async (req, res) => await handleRoute('delete', req, res));
