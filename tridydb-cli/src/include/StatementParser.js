import { parser as tokenParser } from './TokenParser.js';

import { isEmpty }     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { List }        from '../utility/List.js';

class StatementParser {
    constructor() {
        this.parser = tokenParser;

        this.carry      = [ ];
        this.last_depth = 0;
        this.last_ended = false;
    }

    load(input) {
        this.parser.load(input);
    }

    clear() {
        this.parser.clear();

        this.carry      = [ ];
        this.last_depth = 0;
        this.last_ended = false;
    }

    isStatementComplete() {
        return (this.last_depth === 0) && (this.last_ended === true);
    }

    isCarryEmpty() {
        return isEmpty(this.carry);
    }

    readNext() {
        const tokens = new List();

        const pool = [ ];
        let idx;

        let token;

        for (token of this.carry) {
            pool.push(token);
        }
        
        while (token = this.parser.next()) {
            pool.push(token);
        }

        let stmt_cutoff = null;
        for (idx = 0; idx < pool.length; idx++) {
            if (pool[idx].is('punc', '{')) {
                this.last_depth++;
            } else if (pool[idx].is('punc', '}')) {
                this.last_depth--;

                if (this.last_depth < 0) {
                    throw new SyntaxError(`line ${pool[idx].pos.line}, col ${pool[idx].pos.col}: Unexpected token "}".`);
                }
            }

            if (pool[idx].is('punc', ';')) {
                this.last_ended = true;
            } else {
                this.last_ended = false;
            }

            if (this.isStatementComplete()) {
                stmt_cutoff = idx;
                break;
            }
        }

        this.carry = [ ];

        if (stmt_cutoff) {
            for (idx = 0; idx <= stmt_cutoff; idx++) {
                tokens.push(pool[idx]);
            }
            for (idx = stmt_cutoff + 1; idx < pool.length; idx++) {
                this.carry.push(pool[idx]);
            }
        } else {
            for (idx = 0; idx < pool.length; idx++) {
                this.carry.push(pool[idx]);
            }
        }

        return tokens;
    }

    next(opts = { }) {
        opts.accept_carry = opts.accept_carry ?? false;

        const tokens = this.readNext();

        if (!opts.accept_carry) {
            if (!this.isCarryEmpty() && !this.isStatementComplete()) {
                throw new SyntaxError(`The input given contains an incomplete statement (missing final ";" or "}").`);
            }
        }

        if (this.isCarryEmpty()) {
            this.clear();
        }

        if (tokens.isEmpty()) {
            return null;
        } else {
            return tokens;
        }
    }
}

export const parser = new StatementParser();
