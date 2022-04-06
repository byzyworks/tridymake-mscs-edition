import express from 'express';

import { interpreter } from '../include/interpreter.js';

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
                if (opts.handle) {
                    cmd += ` ${opts.handle}`;
                } else {
                    cmd += ` @none`;
                }
            
                if (opts.tags) {
                    cmd += ` @as ${opts.tags}`;
                }
            
                if (opts.state) {
                    cmd += ` @is @${opts.statetype} ${opts.state} @end`;
                }
            } else {
                cmd += ` @${opts.type} ${opts.data} @end`;
            }
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

    if ((opts.type === 'verb') && (method !== 'put')) {
        throw new ServerError('Only the PUT method is allowed when sending commands to a Tridy server in verbatim mode.', { is_fatal: false });
    }

    const cmd  = toTridy(op_map[method], opts);

    const out  = await interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
}

export const routes = express.Router();

routes.get('/',    async (req, res) => await handleRoute('get', req, res));
routes.post('/',   async (req, res) => await handleRoute('post', req, res));
routes.put('/',    async (req, res) => await handleRoute('put', req, res));
routes.delete('/', async (req, res) => await handleRoute('delete', req, res));
