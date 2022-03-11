import express         from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from './logger';

export interface AppErrorOpts {
    http_code?:  StatusCodes,
    is_warning?: boolean,
    is_fatal?:   boolean
}

export class AppError extends Error {
    public readonly original: Error | null;
    public readonly opts:     AppErrorOpts;

    constructor(description: string, original: unknown, opts?: AppErrorOpts) {
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

        if (opts === undefined) {
            opts = { };
        }
        this.opts = { };

        this.opts.http_code  = (opts.http_code === undefined)  ? StatusCodes.INTERNAL_SERVER_ERROR : opts.http_code;
        this.opts.is_warning = (opts.is_warning === undefined) ? false                             : opts.is_warning;
        this.opts.is_fatal   = (opts.is_fatal === undefined)   ? true                              : opts.is_fatal;
        
        Error.captureStackTrace(this);
    }
}

interface ErrorResponseProd {
    status: number,
}

interface ErrorResponseDev {
    status:  number,
    details: string
}

type ErrorResponse = ErrorResponseProd | ErrorResponseDev;

class ErrorHandler {
    lastError?: unknown;

    constructor() { }

    handle(err: unknown): void {
        if (process.exitCode === 0) {
            this.lastError = err;

            try {
                if ((err instanceof AppError) && (err.opts.is_warning)) {
                    logger.warn(err.message);
                } else if (err instanceof Error) {
                    logger.error(err.message);
                }
                if ((err instanceof Error) && (err.stack !== undefined)) {
                    logger.debug(err.stack);
                }

                if ((err instanceof AppError) && (err.original !== null)) {
                    logger.debug(`Reason: ${err.original.message}`);
                    if (err.original.stack !== undefined) {
                        logger.debug(err.original.stack);
                    }
                }
            } finally {
                if (!(err instanceof AppError) || (err.opts.is_fatal)) {
                    logger.end();
                    process.exitCode = 1;
                }
            }
        }
    }

    errorResponse(req: express.Request, res: express.Response): void {
        let status: number;
        if ((this.lastError instanceof AppError) && (this.lastError.opts.http_code !== undefined)) {
            status = this.lastError.opts.http_code;
        } else {
            status = StatusCodes.INTERNAL_SERVER_ERROR;
        }

        res.status(status);

        let msg: ErrorResponse;
        if ((this.lastError instanceof Error) && (process.env.NODE_ENV === 'development')) {
            let details: string;
            if (this.lastError.stack === undefined) {
                details = this.lastError.message;
            } else {
                details = this.lastError.stack;
            }

            msg = {
                status:  status,
                details: details
            };
        } else {
            msg = {
                status: status
            };
        }
        
        res.json(msg);
    }
}

export const errorHandler = new ErrorHandler();
