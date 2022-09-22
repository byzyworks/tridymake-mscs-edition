import { TokenLexer } from './TokenLexer.js';

import { isEmpty }     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Token }       from '../utility/Token.js';

export class StatementLexer {
    constructor() {
        this._lexer = new TokenLexer();

        this._carry      = [ ];
        this._last_depth = 0;
        this._last_ended = false;
    }

    load(input, opts) {
        this._lexer.load(input, opts);
    }

    clear() {
        this._lexer.clear();

        this._carry      = [ ];
        this._last_depth = 0;
        this._last_ended = false;
    }

    _isStatementComplete() {
        return (this._last_depth === 0) && (this._last_ended === true);
    }

    _isCarryEmpty() {
        return isEmpty(this._carry);
    }

    isCarrying() {
        return (!this._isCarryEmpty() && !this._isStatementComplete());
    }

    _readNext() {
        const tokens = [ ];

        const pool = [ ];
        let idx;

        let token;

        for (token of this._carry) {
            pool.push(token);
        }
        
        while (token = this._lexer.next()) {
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
            if (pool[idx].is('sym', '{')) {
                this._last_depth++;
            } else if (pool[idx].is('sym', '}')) {
                this._last_depth--;

                if (this._last_depth < 0) {
                    throw new SyntaxError(Token.getPosString(pool[idx].debug) + `: Unexpected token "}".`);
                }
            }

            if (pool[idx].is('sym', ';')) {
                this._last_ended = true;
            } else {
                this._last_ended = false;
            }

            if (this._isStatementComplete()) {
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
        opts.accept_carry = opts.accept_carry ?? false;

        const tokens = this._readNext();

        if (!opts.accept_carry && this.isCarrying()) {
            throw new SyntaxError(`The input given contains an incomplete statement (missing final ";" or "}").`);
        }

        // Clearing is done so the line and col can be made with respect to any new statement that comes next.
        if (this._isCarryEmpty()) {
            this.clear();
        }

        if (isEmpty(tokens)) {
            return null;
        }
        return tokens;
    }
}
