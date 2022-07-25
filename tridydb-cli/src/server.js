import express from 'express';

import { routes } from './routes/index.js';

import { error_handler }      from './utility/error.js';
import { logger, httpLogger } from './utility/logger.js';
import { StateTree }          from './utility/StateTree.js';

const getRESTMethodsRecursive = (input, methods) => {
    const operation = input.enterGetAndLeave('operation');
    switch (operation) {
        case 'multi':
        case 'import':
            input.traverse(() => {
                getRESTMethodsRecursive(input, methods);
            });
            break;
        case 'print':
        case '_save':
        case 'nop':
            methods.get = true;
            break;
        case 'compose':
        case '_load':
            methods.post = true;
            break;
        case 'overwrite':
        case 'edit':
        case 'tag':
        case 'untag':
            methods.put = true;
            break;
        case 'delete':
            methods.delete = true;
            break;
        default:
            /**
             * No security reason why it's methods.put and not methods.get.
             * However, anything "else" (an unknown operations) suggests an badly-formatted tree.
             * In other words, it's probably better not to waste CPU cycles on it, if it can be avoided.
             */
            methods.put = true;
            break;
    }
}

export const getRESTMethods = (input) => {
    input = new StateTree(input);

    /**
     * The "methods" structure is intentionally used in two different ways here.
     * The first is for determining what methods an abstract syntax tree would invoke.
     * In other words, what permissions will be required.
     * 
     * GET (lowest permissions) is only capable of reading and not writing.
     * POST operations have the ability to write, but when successful are never "idempotent" (only creates new modules).
     * PUT (highest permissions) can do idempotent writes, or in other words can do everything, so it's also a catch-all for every operation.
     * DELETE operations have the ability to write, but obviously can only delete and not create new modules.
     */

    const methods = {
        get:    false,
        post:   false,
        put:    false,
        delete: false
    };

    input.traverse(() => {
        getRESTMethodsRecursive(input, methods);
    });
    
    /**
     * In this part, the "methods" structure is used for determining what HTTP methods can fulfill those permissions.
     * In other words, what are the common denominators.
     * 
     * GET fully overlaps with all other operations, meaning every method can perform reads.
     * PUT, on the other hand, overlaps only with itself, so if PUT was set true previously, the PUT method *will* be required.
     * POST and DELETE are mutually exclusive, so if a tree has both, the PUT method will also be required.
     * In some situations, a delete plus a non-idempotent write is equivalent to an idempotent write.
     */
    if ((methods.put === true) || ((methods.post === true) && (methods.delete === true))) {
        methods.get    = false;
        methods.post   = false;
        methods.put    = true;
        methods.delete = false;
    } else if (methods.delete === true) {
        methods.get    = false;
        methods.post   = false;
        methods.put    = true;
        methods.delete = true;
    } else if (methods.post === true) {
        methods.get    = false;
        methods.post   = true;
        methods.put    = true;
        methods.delete = false;
    } else if (methods.get === true) {
        methods.get    = true;
        methods.post   = true;
        methods.put    = true;
        methods.delete = true;
    }

    return methods;
}

export const server = async (opts = { }) => {
    const app = express();
    
    app.use((req, res, next) => {
        if (process.exitCode === 0) {
            next();
        } else {
            error_handler.errorResponse(req, res);
        }
    });
    app.use(httpLogger);
    app.use(routes);
    app.use((err, req, res, next) => {
        error_handler.handle(err);
        error_handler.errorResponse(req, res);
    });
    
    if (opts.ipv6Only !== true) {
        const address = opts.localhost ? '127.0.0.1' : '0.0.0.0';
        app.listen(opts.serverPort, address, () => {
            logger.info(`Server started listening on ${address}:${opts.serverPort}.`);
        });
    }

    if (opts.ipv4Only !== true) {
        const address = opts.localhost ? '::1' : '::';
        app.listen(opts.serverPort, address, () => {
            logger.info(`Server started listening on ${address}:${opts.serverPort}.`);
        });
    }
}
