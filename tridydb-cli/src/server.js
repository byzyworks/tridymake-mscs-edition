import express from 'express';

import { routes } from './routes/index.js';

import { error_handler }      from './utility/error.js';
import { logger, httpLogger } from './utility/logger.js';

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
