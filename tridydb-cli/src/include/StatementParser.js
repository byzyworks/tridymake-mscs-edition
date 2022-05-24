import { parser as tokenParser } from './TokenParser.js';

import { isEmpty }     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { List }        from '../utility/List.js';

class StatementParser {
    constructor() {
        this._parser = tokenParser;

        this._carry      = [ ];
        this._last_depth = 0;
        this._last_ended = false;
    }

    load(input) {
        this._parser.load(input);
    }

    clear() {
        this._parser.clear();

        this._carry      = [ ];
        this._last_depth = 0;
        this._last_ended = false;
    }

    isStatementComplete() {
        return (this._last_depth === 0) && (this._last_ended === true);
    }

    isCarryEmpty() {
        return isEmpty(this._carry);
    }

    _readNext() {
        const tokens = new List();

        const pool = [ ];
        let idx;

        let token;

        for (token of this._carry) {
            pool.push(token);
        }
        
        while (token = this._parser.next()) {
            pool.push(token);
        }

        this._last_depth = 0;
        this._last_ended = false;

        let stmt_cutoff = null;
        for (idx = 0; idx < pool.length; idx++) {
            /**
             * Nested Tridy statements have to be executed with their parent statements, so the statement isn't complete until the root statement is reached again.
             * That's why the brackets are checked for in addition to the semicolons.
             * Also, start at 0 instead of this._carry.length, as there may be complete statements inside the carry that need to be run first.
             * This parser only goes one statement at a time, and one input might have many.
             */
            if (pool[idx].is('punc', '{')) {
                this._last_depth++;
            } else if (pool[idx].is('punc', '}')) {
                this._last_depth--;

                if (this._last_depth < 0) {
                    throw new SyntaxError(`line ${pool[idx].debug.line}, col ${pool[idx].debug.col}: Unexpected token "}".`);
                }
            }

            if (pool[idx].is('punc', ';')) {
                this._last_ended = true;
            } else {
                this._last_ended = false;
            }

            if (this.isStatementComplete()) {
                stmt_cutoff = idx;
                break;
            }
        }

        this._carry = [ ];

        if (stmt_cutoff === null) {
            for (idx = 0; idx < pool.length; idx++) {
                this._carry.push(pool[idx]);
            }
        } else {
            for (idx = 0; idx <= stmt_cutoff; idx++) {
                tokens.push(pool[idx]);
            }
            for (idx = stmt_cutoff + 1; idx < pool.length; idx++) {
                this._carry.push(pool[idx]);
            }
        }

        return tokens;
    }

    next(opts = { }) {
        const tokens = this._readNext();

        if (!opts.accept_carry && !this.isCarryEmpty() && !this.isStatementComplete()) {
            throw new SyntaxError(`The input given contains an incomplete statement (missing final ";" or "}").`);
        }

        // Clearing is done so the line and col can be made with respect to any new statement that comes next.
        if (this.isCarryEmpty()) {
            this.clear();
        }

        if (tokens.isEmpty()) {
            return null;
        }
        return tokens;
    }
}

export const parser = new StatementParser();
