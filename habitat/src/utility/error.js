import { StatusCodes } from 'http-status-codes';

import { logger } from './logger.js';

export class LogicError extends Error {
    constructor(description) {
        description = 'Logic Error: ' + description;

        super(description);
        Object.setPrototypeOf(this, new.target.prototype);

        Error.captureStackTrace(this);
    }
}

export class SyntaxError extends Error {
    constructor(description) {
        description = 'Syntax Error: ' + description;

        super(description);
        Object.setPrototypeOf(this, new.target.prototype);

        Error.captureStackTrace(this);
    }
}

export class ServerError extends Error {
    constructor(description, original, opts = { }) {
        super(description);
        Object.setPrototypeOf(this, new.target.prototype);
        
        if (original instanceof Error) {
            this.original = original;
        } else {
            if (original !== null) {
                logger.error('Non-error thrown!');
            }
            this.original = null;
        }

        this.opts.http_code  = opts.http_code  ?? StatusCodes.INTERNAL_SERVER_ERROR;
        this.opts.is_warning = opts.is_warning ?? false;
        this.opts.is_fatal   = opts.is_fatal   ?? true;
        
        Error.captureStackTrace(this);
    }
}

class ErrorHandler {
    constructor() { }

    handle(err) {
        if (process.exitCode === 0) {
            this.lastError = err;

            try {
                if ((err instanceof ServerError) && (err.opts.is_warning)) {
                    logger.warn(err.message);
                } else if (err instanceof Error) {
                    logger.error(err.message);
                }
                if ((err instanceof Error) && (err.stack !== undefined)) {
                    logger.debug(err.stack);
                }

                if ((err instanceof ServerError) && (err.original !== null)) {
                    logger.debug(`Reason: ${err.original.message}`);
                    if (err.original.stack !== undefined) {
                        logger.debug(err.original.stack);
                    }
                }
            } finally {
                if (!(err instanceof ServerError) || (err.opts.is_fatal)) {
                    logger.end();
                    process.exitCode = 1;
                }
            }
        }
    }

    errorResponse(req, res) {
        let status;
        if ((this.lastError instanceof ServerError) && (this.lastError.opts.http_code !== undefined)) {
            status = this.lastError.opts.http_code;
        } else {
            status = StatusCodes.INTERNAL_SERVER_ERROR;
        }

        res.status(status);

        let msg = {
            status: status
        };
        if ((this.lastError instanceof Error) && (process.env.NODE_ENV === 'development')) {
            msg.message = this.lastError.message;
            if (this.lastError.stack !== undefined) {
                msg.stack = this.lastError.stack;
            }
        }
        
        res.json(msg);
    }
}

export const errorHandler = new ErrorHandler();
