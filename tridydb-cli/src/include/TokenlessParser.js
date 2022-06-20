import { Token } from './Token.js';

import * as common     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';

export class TokenlessParser {
    constructor() { }

    static _handleUnexpected() {
        throw new SyntaxError('An incorrectly-formatted set of commands sent as an abstract syntax tree was received by the server, and was subsequently discarded.');
    }

    static _handleContext(input) {
        if (typeof input === 'string') {
            return;
        }
        
        if (!common.isDictionary(input)) {
            this._handleUnexpected();
        }
        
        if (typeof input.op !== 'string') {
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

    static _handleContextAppendix(input) {
        if (!common.isNullish(input.limit)) {
            if ((typeof input.limit !== 'number') && !Number.isInteger(input.limit)) {
                this._handleUnexpected();
            }
        }
    }

    static _handleDefinition(input) {
        if (!common.isNullish(input[common.global.defaults.alias.type])) {
            if (typeof input[common.global.defaults.alias.type] !== 'string') {
                this._handleUnexpected();
            }
        }
        
        if (!common.isNullish(input[common.global.defaults.alias.tags])) {
            if (!common.isArray(input[common.global.defaults.alias.tags])) {
                this._handleUnexpected();
            }

            for (const tag of input[common.global.defaults.alias.tags]) {
                if (typeof tag !== 'string') {
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

            this._handleContext(input.context.expression);

            this._handleContextAppendix(input.context);
        }

        if (typeof input.operation !== 'string') {
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