import express         from 'express';
import { StatusCodes } from 'http-status-codes';

import { HTTPMethodParser }      from '../include/HTTPMethodParser.js';
import { TokenlessSyntaxParser } from '../include/TokenlessSyntaxParser.js';

import { deepCopy, isEmpty }                  from '../utility/common.js';
import { SyntaxError, ServerSideServerError } from '../utility/error.js';
import { logger }                             from '../utility/logger.js';
import { global }                             from '../utility/mapped.js';

import { db } from '../database.js';

const handleRoute = async (method, req, res, next) => {
    const opts = deepCopy(req.query);

    if (opts.format === 'tree') {
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
        return next(new ServerSideServerError(`Unknown request query format.`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false }));
    }

    let command;

    try {
        if (opts.format === 'tree') {
            logger.debug(`Received Tridy syntax: ${opts.data}`);

            command = TokenlessSyntaxParser.parse(opts.data);
        } else if (opts.format === 'verb') {
            logger.debug(`Received Tridy statements: ${opts.data}`);

            command = await db.query(opts.data, {
                tokenless:    false,
                accept_carry: false,
                astree_only:  true
            });
        }
    } catch (err) {
        if ((err instanceof SyntaxError) || (err instanceof ServerSideServerError)) {
            return next(err);
        }
    }

    const allowed = HTTPMethodParser.parse(command);
    if (allowed[method] === false) {
        return next(new ServerSideServerError(`The ${method.toUpperCase()} method does not have sufficient permissions to handle the request received previously.`, null, { http_code: StatusCodes.BAD_REQUEST, is_fatal: false }));
    }

    let output;
    
    try {
        // We do not want to accept carry on the server-side since managing token carry is the client's job.
        // However, it makes no difference if the client sends a syntax tree directly.
        output = await db.query(command, {
            tokenless:    true,
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
        if (!isEmpty(output)) {
            output = await db.stringify(output);
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
    
        res.send(output);
    } else {
        res.json(output);
    }
}

export const routes = express.Router();

routes.get(   '/', async (req, res, next) => await handleRoute('get',    req, res, next));
routes.post(  '/', async (req, res, next) => await handleRoute('post',   req, res, next));
routes.put(   '/', async (req, res, next) => await handleRoute('put',    req, res, next));
routes.delete('/', async (req, res, next) => await handleRoute('delete', req, res, next));
