import winston from 'winston';
import morgan  from 'morgan';

import * as common from './common.js';

export const log_levels     = winston.config.npm.levels;
const        log_level_opts = Object.keys(log_levels);

export const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `[${info.timestamp}] [${common.APP.NAME}] [${info.level}] ${info.message}`
    )
);

export const transports = {
    error: new winston.transports.File({
        filename: 'logs/error.log',
        level:    'error',
        format:   winston.format.combine(
            format,
            winston.format.json(),
        )
    }),
    info: new winston.transports.File({
        filename: 'logs/combined.log',
        level:    'info',
        format:   winston.format.combine(
            format,
            winston.format.json()
        )
    }),
    console: new winston.transports.Console({
        level: 'info'
    })
};

winston.addColors(winston.config.npm.colors);

export const logger = winston.createLogger({
    levels:      log_levels,
    format:      format,
    transports:  Object.values(transports),
    exitOnError: false
});

export const httpLogger = morgan('combined', {
    skip: (req, res) => {
        return false;
    },
    stream: {
        write: (msg) => {
            logger.http(msg);
        }
    }
});
