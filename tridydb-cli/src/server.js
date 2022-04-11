import express from 'express';

import { routes }             from './routes/index.js';
import { error_handler }      from './utility/error.js';
import { logger, httpLogger } from './utility/logger.js';

export const server = async (opts = { }) => {
    opts.ipv4Only       = opts.ipv4Only       ?? false;
    opts.ipv6Only       = opts.ipv6Only       ?? false;
    opts.localhost_only = opts.localhost_only ?? true;
    opts.port           = opts.port           ?? 21780;
    
    if ((opts.ipv4Only === true) && (opts.ipv6Only === true)) {
        logger.error(`--ipv4-only and --ipv6-only cannot both be set at the same time.`);
    }

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
        let address = opts.localhost_only ? '127.0.0.1' : '0.0.0.0';
        app.listen(opts.port, address, () => {
            logger.info(`Server started listening on ${address}:${opts.port}.`);
        });
    }

    if (opts.ipv4Only !== true) {
        let address = opts.localhost_only ? '::1' : '::';
        app.listen(opts.port, address, () => {
            logger.info(`Server started listening on ${address}:${opts.port}.`);
        });
    }
}
