import * as common     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Token }       from '../utility/Token.js';

export class TokenlessParser {
    constructor() { }

    static _handleUnexpected() {
        throw new SyntaxError('An incorrectly-formatted set of commands sent as an abstract syntax tree was received by the server, and was subsequently discarded.');
    }

    static _handleInteger(input) {
        if ((typeof input !== 'number') || !Number.isInteger(input)) {
            this._handleUnexpected();
        }
    }

    static _handlePositiveInteger(input) {
        if ((typeof input !== 'number') || (!Number.isInteger(input) && (Number(input) >= 0))) {
            this._handleUnexpected();
        }
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
            this._handlePositiveInteger(input.limit);
        }

        if (!common.isNullish(input.offset)) {
            this._handlePositiveInteger(input.offset);
        }

        if (!common.isNullish(input.repeat)) {
            this._handlePositiveInteger(input.repeat);
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
    }

    static _handleOutput(input) {
        if (!common.isNullish(input.indent)) {
            this._handleInteger(input.indent);
        }

        if (!common.isNullish(input.compression)) {
            this._handlePositiveInteger(input.compression);
        }

        if (!common.isNullish(input.format)) {
            if (typeof input.format !== 'string') {
                this._handleUnexpected();
            }
        }

        if (!common.isNullish(input.file)) {
            if (typeof input.list_mode !== 'string') {
                this._handleUnexpected();
            }
        }

        if (!common.isNullish(input.file)) {
            if (typeof input.file !== 'string') {
                this._handleUnexpected();
            }
        }

        if (!common.isNullish(input.file_mode)) {
            if (typeof input.file_mode !== 'string') {
                this._handleUnexpected();
            }
        }

        if (!common.isNullish(input.file_quiet)) {
            if (typeof input.file_quiet !== 'boolean') {
                this._handleUnexpected();
            }
        }

        if (!common.isNullish(input.file_quiet)) {
            this._handleInteger(input.list_nonce);
        }

        if (!common.isNullish(input.file_quiet)) {
            this._handleInteger(input.stmt_nonce);
        }
    }

    static _handleFunctions(input) {
        if (!common.isNullish(input.module)) {
            if (!common.isArray(input.module)) {
                this._handleUnexpected();
            }
        }

        if (!common.isNullish(input[common.global.defaults.alias.free])) {
            if (!common.isArray(input[common.global.defaults.alias.free])) {
                this._handleUnexpected();
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

        if (!common.isNullish(input[common.global.defaults.alias.nested])) {
            if (!common.isArray(input[common.global.defaults.alias.nested])) {
                this._handleUnexpected();
            }

            for (const stmt of input[common.global.defaults.alias.nested]) {
                this._handleStatement(stmt);
            }
        }

        if (!common.isNullish(input.output)) {
            if (!common.isDictionary(input.output)) {
                this._handleUnexpected();
            }

            this._handleOutput(input.output);
        }

        if (!common.isNullish(input.functions)) {
            if (!common.isDictionary(input.functions)) {
                this._handleUnexpected();
            }

            this._handleFunctions(input.functions);
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

        return input;
    }
}