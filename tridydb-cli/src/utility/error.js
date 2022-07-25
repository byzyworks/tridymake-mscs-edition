import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { isNullish } from './common.js';
import { logger }    from './logger.js';

class ClientError extends Error { }

export class FileError extends ClientError {
    constructor(description) {
        description = 'File Error: ' + description;

        super(description);
        Object.setPrototypeOf(this, new.target.prototype);

        Error.captureStackTrace(this);
    }
}

export class SyntaxError extends ClientError {
    constructor(description) {
        description = 'Syntax Error: ' + description;

        super(description);
        Object.setPrototypeOf(this, new.target.prototype);

        Error.captureStackTrace(this);
    }
}

class ServerError extends Error { }

export class ClientSideServerError extends ServerError {
    constructor(server_error = null) {
        let http_code = StatusCodes.NOT_FOUND;
        if (server_error && server_error.status) {
            http_code = server_error.status;
        }

        let description = 'Error ' + http_code + ': ' + getReasonPhrase(http_code);
        if (server_error && server_error.message) {
            description = server_error.message;
        }
        
        super(description);
        Object.setPrototypeOf(this, new.target.prototype);

        if (server_error && server_error.stack) {
            this.stack = server_error.stack;
        }

        /**
         * There are a couple of reasons why is_fatal is always false, but first, the alternatives.
         * The obvious choice would be for the server to provide info on whether an error is fatal or not.
         * However, this is information that in general it's assumed a server shouldn't need to provide to the client.
         * Important information, like what type of error something is, is only provided by the server in debug mode.
         * Only the return status code is provided in both development and production.
         * This does not provide enough information on its own.
         * Thus, it becomes a question of user-friendliness, and the best option is rather to leave the client session open.
         * That is in case the server's issues are resolved and/or it is restarted.
         * Note that non-fatal syntax errors are already generated and handled by the client before forwarding requests.
         * As a result, this should never be thrown for reasons not already fatal to the server.
         */
        this.opts = {
            http_code:  http_code,
            is_warning: false,
            is_fatal:   false,
            is_wrapper: false
        };
    }
}

export class ServerSideServerError extends ServerError {
    constructor(description, original, opts = { }) {
        opts.http_code  = opts.http_code  ?? StatusCodes.INTERNAL_SERVER_ERROR;
        opts.is_warning = opts.is_warning ?? false;
        opts.is_fatal   = opts.is_fatal   ?? true;
        opts.is_wrapper = opts.is_wrapper ?? false;

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

        Error.captureStackTrace(this);

        this.opts = {
            http_code:  opts.http_code,
            is_warning: opts.is_warning,
            is_fatal:   opts.is_fatal,
            is_wrapper: opts.is_wrapper
        };
    }
}

class ErrorHandler {
    constructor() { }

    handle(err) {
        if ((err instanceof ServerSideServerError) && !isNullish(err.original) && (err.opts.is_wrapper)) {
            err.message  = err.original.message;
            err.stack    = err.original.stack;
            err.original = err.original.original;
        }

        if (process.exitCode === 0) {
            this.lastError = err;

            try {
                if ((err instanceof ServerSideServerError) && (err.opts.is_warning)) {
                    logger.warn(err.message);
                } else if (err instanceof Error) {
                    logger.error(err.message);
                }
                if ((err instanceof Error) && (err.stack !== undefined)) {
                    logger.debug(err.stack);
                }

                if ((err instanceof ServerSideServerError) && !isNullish(err.original)) {
                    logger.debug(`Reason: ${err.original.message}`);
                    if (err.original.stack !== undefined) {
                        logger.debug(err.original.stack);
                    }
                }
            } finally {
                if (!(err instanceof ClientError) && (!(err instanceof ServerError) || (err.opts.is_fatal === true))) {
                    logger.end();
                    process.exitCode = 1;
                }
            }
        }
    }

    errorResponse(req, res) {
        let status;
        if ((this.lastError instanceof ServerSideServerError) && (this.lastError.opts.http_code !== undefined)) {
            status = this.lastError.opts.http_code;
        } else if (this.lastError instanceof ClientError) {
            status = StatusCodes.BAD_REQUEST;
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

export const error_handler = new ErrorHandler();
