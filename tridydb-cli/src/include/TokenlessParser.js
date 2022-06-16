import { Token } from './Token.js';

import * as common     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';

export class TokenlessParser {
    constructor() { }

    static _handleUnexpected() {
        throw new SyntaxError('An incorrectly-formatted set of commands sent as an abstract syntax tree was received by the server, and was subsequently discarded.');
    }

    static _handleContext(input) {
        if (common.isPrimitive(input)) {
            return;
        }
        
        if (!common.isDictionary(input)) {
            this._handleUnexpected();
        }
        
        if (!common.isString(input.op)) {
            this._handleUnexpected();
        }

        const tested = new Token('ctxt_op', input.op);
        if (tested.isUnaryOpContextToken()) {
            this._handleContext(input.a);
        } else if (tested.isBinaryOpContextToken()) {
            this._handleContext(input.a);
            this._handleContext(input.b);
        } else if (tested.isTernaryFirstOpContextToken()) {
            this._handleContext(input.a);
            this._handleContext(input.b);
            this._handleContext(input.c);
        }
    }

    static _handleDefinition(input) {
        if (!common.isNullish(input[common.global.defaults.alias.type])) {
            if (!common.isString(input[common.global.defaults.alias.type])) {
                this._handleUnexpected();
            }
        }
        
        if (!common.isNullish(input[common.global.defaults.alias.tags])) {
            if (!common.isArray(input[common.global.defaults.alias.tags])) {
                this._handleUnexpected();
            }

            for (const tag of input[common.global.defaults.alias.tags]) {
                if (!common.isString(tag)) {
                    this._handleUnexpected();
                }
            }
        }

        if (!common.isNullish(input[common.global.defaults.alias.nested])) {
            if (!common.isArray(input[common.global.defaults.alias.nested])) {
                this._handleUnexpected();
            }

            for (const stmt of input[common.global.defaults.alias.nested]) {
                this._handleStatement(stmt);
            }
        }
    }

    static _handleStatement(input) {
        if (!common.isNullish(input.context)) {
            if (!common.isDictionary(input.context)) {
                this._handleUnexpected();
            }

            if (!common.isBoolean(input.context.greedy)) {
                this._handleUnexpected();
            }
            
            this._handleContext(input.context.expression);
        }

        if (!common.isString(input.operation)) {
            this._handleUnexpected();
        }

        if (!common.isNullish(input.definition)) {
            if (!common.isDictionary(input.definition)) {
                this._handleUnexpected();
            }

            this._handleDefinition(input.definition);
        }

        if (!common.isNullish(input.compression)) {
            if (isNaN(input.compression)) {
                this._handleUnexpected();
            }
        }
    }

    static parse(input) {
        try {
            input = JSON.parse(input);
        } catch (err) {
            this._handleUnexpected();
        }

        if (!common.isDictionary(input)) {
            this._handleUnexpected();
        }

        if (!common.isArray(input[common.global.defaults.alias.nested])) {
            this._handleUnexpected();
        }

        for (const stmt of input[common.global.defaults.alias.nested]) {
            this._handleStatement(stmt);
        }
    }
}