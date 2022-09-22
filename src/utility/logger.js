import path              from 'path';
import { fileURLToPath } from 'url';

import winston from 'winston';
import morgan  from 'morgan';

import { APP } from './mapped.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export const log_levels = winston.config.npm.levels;

export const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `[${info.timestamp}] [${APP.NAME}] [${info.level}] ${info.message}`
    )
);

export const transports = {
    error: new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level:    'error',
        format:   winston.format.combine(
            format,
            winston.format.json(),
        )
    }),
    info: new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        level:    'info',
        format:   winston.format.combine(
            format,
            winston.format.json()
        )
    }),
    console: new winston.transports.Console({
        level: 'info',
        consoleWarnLevels: ['warn'],
        stderrLevels: ['error', 'debug']
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
