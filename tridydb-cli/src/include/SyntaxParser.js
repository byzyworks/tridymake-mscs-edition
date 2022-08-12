import fs from 'fs';

import * as xml  from 'xml-js';
import * as yaml from 'js-yaml';

import { ContextParser } from './ContextParser.js';
import { Tridy }         from './Interpreter.js';

import * as common                            from '../utility/common.js';
import { SyntaxError, FileError }             from '../utility/error.js';
import { List }                               from '../utility/List.js';
import { StateTree }                          from '../utility/StateTree.js';
import { Tag }                                from '../utility/Tag.js';
import { Token }                              from '../utility/Token.js';
import { global, CONTEXT_MAP, OPERATION_MAP } from '../utility/mapped.js';

export class SyntaxParser {
    constructor() {
        this._stmt_nonce = 0;
        this._list_nonce = 0;
    }

    _handleUnexpected(token = null) {
        token = token ?? this._tokens.peek();
        switch (token.debug.type) {
            case 'key':
                throw new SyntaxError(Token.getPosString(token.debug) + `: Unexpected clause "@${token.debug.val}".`);
            default:
                throw new SyntaxError(Token.getPosString(token.debug) + `: Unexpected token "${token.debug.val}".`);
        }
    }

    _handleControlOperation() {
        // Control statements tend to have functionality that is handled elsewhere.
        const current = this._tokens.peek();
        if (current.is('key', 'tridy')) {
            this._tokens.next();
        } else if (current.is('key', 'split')) {
            this._list_nonce++;
            
            this._tokens.next();
        } else if (current.is('key', 'clear')) {
            global.flags.clear = true;

            this._tokens.next();
        } else if (current.is('key', 'exit')) {
            global.flags.exit = true;

            this._tokens.next();
        }
    }

    // The operator given below is what the parser assumes the user means when two operands are separated by no operand other than a whitespace.
    // Why is this chosen? Semantically, the assumption is that if a module is described with two words (tags) alone, then it should match both.
    _getContextImplicitBinaryOp () {
        return new Token('ctxt_op', CONTEXT_MAP.AND);
    }

    _handleContextValueExpression(context) {
        let current;

        current = this._tokens.peek().toContextToken();
        if (!current.is('ctxt_misc', CONTEXT_MAP.LEFT_PARENTHESES)) {
            this._handleUnexpected();
        }
        context.push(current);
        this._tokens.next();
        
        current = this._tokens.peek();
        if (current.is('key', 'function')) {
            this._tokens.next();

            const call = this._readFunctionCall();

            context.push(current.to('ctxt_func', call));
        } else {
            current = this._tokens.peek().toContextToken();
            if (!current.is('ctxt_term') || current.isIdentifierOnlyTerminalContextToken()) {
                this._handleUnexpected();
            }
            context.push(current);
            this._tokens.next();
        }

        current = this._tokens.peek();
        if (current.is('sym')) {
            current.val = CONTEXT_MAP.VALUE_SYMBOL + current.val; // The '$' prevents confusion with @parent (>) or @child (<).
        }
        current = current.toContextToken();
        if (!current.isBinaryValueOpContextToken()) {
            this._handleUnexpected();
        }
        context.push(current);
        this._tokens.next();

        // The RHS of a value expression is exceptional as a context terminal.
        current = this._tokens.peek();
        if (current.is('key', 'none')) {
            context.push(current.to('ctxt_term', undefined));

            this._tokens.next();
        } else {
            const value = this._readString({ allow_dynamic: true });
            if (value === undefined) {
                this._handleUnexpected();
            }

            context.push(current.to('ctxt_term', value));
        }

        current = this._tokens.peek().toContextToken();
        if (!current.is('ctxt_misc', CONTEXT_MAP.RIGHT_PARENTHESES)) {
            this._handleUnexpected();
        }
        context.push(current);
        this._tokens.next();
    }

    _handleMacroContextTerminal(context) {
        let current = this._tokens.peek().toContextToken();

        if (current.is('ctxt_term', CONTEXT_MAP.RECURSIVE_WILDCARD)) {
            context.push(current.to('ctxt_misc', CONTEXT_MAP.LEFT_PARENTHESES));
            context.push(current.to('ctxt_term', CONTEXT_MAP.WILDCARD));
            context.push(current.to('ctxt_op',   CONTEXT_MAP.INCLUSIVE_RECURSIVE_TRANSITION));
            context.push(current.to('ctxt_term', CONTEXT_MAP.WILDCARD));
            context.push(current.to('ctxt_misc', CONTEXT_MAP.RIGHT_PARENTHESES));

            this._tokens.next();
        } else {
            this._handleUnexpected();
        }
    }

    _handleWhileContextTerminal(context) {
        let current = this._tokens.peek().toContextToken();

        if (current.isIdentifierTerminalContextToken() || current.is('ctxt_misc', CONTEXT_MAP.VALUE_SYMBOL)) {
            if (current.is('ctxt_term')) {
                if (current.isMacroTerminalContextToken()) {
                    this._handleMacroContextTerminal(context);
                } else {
                    context.push(current);

                    this._tokens.next();
                }
            } else if (current.is('ctxt_misc', CONTEXT_MAP.VALUE_SYMBOL)) {
                this._tokens.next();

                this._handleContextValueExpression(context);
            }

            current = this._tokens.peek().toContextToken();

            while (current.isIdentifierTerminalContextToken() || current.is('ctxt_misc', CONTEXT_MAP.VALUE_SYMBOL)) {
                context.push(this._getContextImplicitBinaryOp());
                
                if (current.is('ctxt_term')) {
                    if (current._isMacroTerminalContextToken()) {
                        this._handleMacroContextTerminal(context);
                    } else {
                        context.push(current);

                        this._tokens.next();
                    }
                } else if (current.is('ctxt_misc', CONTEXT_MAP.VALUE_SYMBOL)) {
                    this._tokens.next();
    
                    this._handleContextValueExpression(context);
                }
    
                current = this._tokens.peek().toContextToken();
            }
        }
    }

    _handleWhileContextUnaryOp(context) {
        let current = this._tokens.peek().toContextToken();

        while (current.isUnaryOpContextToken()) {
            context.push(current);
            this._tokens.next();

            current = this._tokens.peek().toContextToken();
        }
    }

    _isPreviousContextExpression(context) {
        return (!common.isEmpty(context) && context[context.length - 1].isExpressionEnderContextToken());
    }
    
    _handleContextPostfixOp(context) {
        if (!this._isPreviousContextExpression(context)) {
            this._handleUnexpected();
        }

        context.push(this._tokens.next().toContextToken());
    }

    _handleContextExpressionInner(context) {
        let current;
        let runs = 0;

        while (true) {
            current = this._tokens.peek().toContextToken();
            if (current.isExpressionStarterContextToken()) {
                if (this._isPreviousContextExpression(context)) {
                    context.push(this._getContextImplicitBinaryOp());
                }

                if (current.isIdentifierTerminalContextToken() || current.is('ctxt_misc', CONTEXT_MAP.VALUE_SYMBOL)) {
                    this._handleWhileContextTerminal(context);
                } else {
                    this._handleContextExpressionOuter(context);
                }
            } else if (current.isBinaryOpContextToken()) {
                this._handleContextPostfixOp(context);

                this._handleContextExpressionOuter(context);
            } else if (current.isTernaryFirstOpContextToken()) {
                this._handleContextPostfixOp(context);

                this._handleContextExpressionOuter(context);

                current = this._tokens.peek().toContextToken();
                if (!current.isTernarySecondOpContextToken()) {
                    this._handleUnexpected();
                }
                this._handleContextPostfixOp(context);

                this._handleContextExpressionOuter(context);
            } else {
                break;
            }

            runs++;
        }

        if (runs === 0) {
            this._handleUnexpected();
        }
    }

    _handleContextExpressionOuter(context) {
        let current;

        this._handleWhileContextUnaryOp(context);

        let is_enclosed = false;

        current = this._tokens.peek().toContextToken();
        if (current.is('ctxt_misc', CONTEXT_MAP.LEFT_PARENTHESES)) {
            context.push(current);
            this._tokens.next();
            
            is_enclosed = true;
        }
        
        this._handleContextExpressionInner(context);

        if (is_enclosed) {
            current = this._tokens.peek().toContextToken();
            if (!current.is('ctxt_misc', CONTEXT_MAP.RIGHT_PARENTHESES)) {
                this._handleUnexpected();
            }

            context.push(current);
            this._tokens.next();
        }
    }

    _readWhileContextExpression() {
        let context = [ ];
        let current;

        this._handleContextExpressionOuter(context);

        while (true) {
            current = this._tokens.peek().toContextToken();
            if (current.isExpressionStarterContextToken()) {
                this._handleContextExpressionOuter(context);
            } else if (current.isBinaryOpContextToken()) {
                this._handleContextPostfixOp(context);
                this._handleContextExpressionOuter(context);
            } else {
                break;
            }
        }

        return context;
    }

    _handleContextAppendixParameter(keyword) {
        let current = this._tokens.peek();
        if (current.is('key', keyword)) {
            this._tokens.next();

            current = this._tokens.peek();
            if (!current.is('tag')) {
                this._handleUnexpected();
            }

            const value = Number(current.val);
            if (!Number.isInteger(value) || (value < 0)) {
                this._handleUnexpected();
            }

            this._astree.enterSetAndLeave(keyword, value);

            this._tokens.next();
        }
    }

    _handleContextAppendixRequiringExpression() {
        this._handleContextAppendixParameter('limit');
        this._handleContextAppendixParameter('offset');
    }

    _handleContextAppendixNotRequiringExpression() {
        this._astree.enterPos('context');

        this._handleContextAppendixParameter('repeat');

        this._astree.leavePos();
    }
    
    _handleContext() {
        let context = this._readWhileContextExpression();
        if (common.isEmpty(context)) {
            this._handleUnexpected();
        }

        // The context expression has to be converted to a tree format before it can be useable, which is a multi-step process handled by a separate parser.
        // It would be even more difficult to parse it in the same human-readable format (as an "infix" array).
        context = ContextParser.parse(context);

        this._astree.enterPos('context');
    
        this._astree.enterSetAndLeave('expression', context);

        this._handleContextAppendixRequiringExpression();

        this._astree.leavePos();
    }

    _readWhileRaw(opts = { }) {
        opts.type      = opts.type      ?? 'mlpart';
        opts.multiline = opts.multiline ?? false;

        let line = 0;
        let data = '';

        if (!this._tokens.peek().is(opts.type)) {
            return null;
        }

        do {
            /**
             * With certain formats like YAML that are whitespace-sensitive, the line feed needs to be respected so the indentation is as well.
             * If there are multiple "part" tokens, this function assumes each is equivalent to one line.
             * This is because if the user is entering the a multi-line string in a special format, the tokenizer will produce a new "part" token for every line until the ending delimiter is received.
             * There are no other circumstances where two or more consecutive "part" tokens are produced.
             */ 
            if (opts.multiline && (line > 0)) {
                data += "\n";
            }

            data += this._tokens.next().val;

            line++;
        } while (this._tokens.peek().is(opts.type));
    
        return data;
    }

    _readString(opts = { }) {
        opts.allow_dynamic = opts.allow_dynamic ?? false;

        const current = this._tokens.peek();
        if ((!opts.allow_dynamic && current.is('tag')) || current.isRawInputSimpleStringToken()) {
            this._tokens.next();

            return current.val;
        }
        if (opts.allow_dynamic) {
            if (current.isRawInputPrimitiveStringToken()) {
                this._tokens.next();

                return common.parseDynamic(current.val);
            }
            
            // The value of a dynamic string can be a literal null. It can't be a literal undefined, however.
            return undefined;
        }
        
        return null;
    }

    async _readFileImport() {
        const link = await this._readString({ allow_dynamic: false });
        if (link === null) {
            return null;
        }

        let content;
        try {
            content = await fs.promises.readFile(link, 'utf-8');
        } catch (err) {
            throw new FileError(err.message);
        }

        return {
            link:    link,
            content: content
        };
    }

    _readFunctionCall() {
        const call = [ ];

        const func = this._readString({ allow_dynamic: false });
        if (func === undefined) {
            this._handleUnexpected();
        }

        call.push(func);

        let arg = this._readString({ allow_dynamic: true });
        while (arg !== undefined) {
            call.push(arg);

            arg = this._readString({ allow_dynamic: true });
        }

        return call;
    }

    async _readWhileRawAndParse(opts = { }) {
        opts.primitive_only = opts.primitive_only ?? false;

        /**
         * Note to return undefined when the raw input stream is empty or its value cannot be determined, and avoid returning null under such circumstances.
         * A literal null value can be entered as user input via. dynamic typing, and thus additionally be returned as a non-error output.
         * Undefined would never be returned since JSON does not translate a literal undefined value to a native type, unlike null.
         */

        let current;
        let type;
        let data;

        if (!this._tokens.peek().isRawInputStartToken()) {
            return undefined;
        }

        current = this._tokens.peek();
        if (current.is('key')) {
            if (opts.primitive_only) {
                return undefined;
            }

            this._tokens.next();

            type = current.val;

            if (this._tokens.peek().is('key', 'file')) {
                this._tokens.next();

                data = (await this._readFileImport()).content;
            } else {
                data = this._readWhileRaw({ type: 'datapart', multiline: true });
            }
        } else if (current.is('lpart')) {
            type = 'line';
            data = this._readWhileRaw({ type: 'lpart', multiline: false });
        } else if (current.is('mlpart')) {
            type = 'multiline';
            data = this._readWhileRaw({ type: 'mlpart', multiline: true });
        } else if (current.is('dynpart')) {
            type = 'dynamic';
            data = this._readWhileRaw({ type: 'dynpart', multiline: true });
        }

        // At this point, even dynamic strings should still just be "strings".
        if (common.isNullish(data)) {
            return undefined;
        }

        if (type === 'line') {
            data = data.replace(/[\f\n\r\v]+/g, '');
        } else if (type === 'dynamic') {
            data = common.parseDynamic(data);
        } else if (type !== 'multiline') {
            /**
             * Both parsers (JSON and YAML) do their own escaping using the backslash characters.
             * Thus, the backslash characters have to themselves be escaped before they are put them.
             * Note not to be fooled by the escape characters here either; "\\" is one backslash literal.
             * 
             * Note for YAML in particular, removing the whitespace at the very beginning is at least an important consideration.
             * Otherwise, if starting on a new line, it may cause the parser to pick up on the initial line feed unexpectedly.
             * Since YAML is whitespace-sensitive, that can end up throwing errors as a result.
             */
            data = data.replace(/\\/g, '\\\\').replace(/^\s+/, '').replace(/\s+$/gm, '');
            if (data === '') {
                return undefined;
            }
        }
        
        try {
            switch (type) {
                case 'line':
                case 'multiline':
                case 'dynamic':
                case 'text':
                    break;
                case 'json':
                    data = JSON.parse(data);
                    break;
                case 'yaml':
                    data = yaml.load(data);
                    break;
                case 'xml':
                    /**
                     * The "root" tags are stripped out automatically by the XML converter.
                     * This allows multiple elements to be inputted without forcing a root tag to also be provided by the user.
                     * Remember that what's being provided as raw input is likely only part of a document, not a full document.
                     * Tridy already provides its own "root elements", like the free data structure's key.
                     */
                    data         = '<root>' + data + '</root>';
                    data         = xml.xml2js(data, { compact: false });
                    data._format = 'xml';
                    break;
            }
        } catch (err) {
            throw new SyntaxError(err.message);
        }

        return data;
    }

    async _handleRawDefinition() {
        if (this._tokens.peek().is('key', 'function')) {
            this._tokens.next();

            const call = this._readFunctionCall();

            this._astree.enterSetAndLeave(['functions', 'module'], call);
        } else {
            const raw = await this._readWhileRawAndParse({ primitive_only: false });
            if (raw === undefined) {
                this._handleUnexpected();
            }
    
            this._astree.enterSetAndLeave('definition', raw);
        }
    }

    _readWhileTag() {
        const tags = [ ];

        let current = this._tokens.peek();
        while (current.isTagsetToken()) {
            let new_tag  = current.val;
            let func_tag = false;

            // When a clause token is produced, the @ at the beginning of it is lost.
            // To continue distinguishing it from regular tags here, it is added back.
            // It is assumed that the outer if-statement will filter out clauses that can't perform as tags.
            if (current.is('tag')) {
                // There is no reason one would want to post duplicate tags in the same module.
                // Allowing it would only lead to wasted CPU cycles when evaluating tags inside context expressions against the modules.
                for (const current_tag of tags) {
                    if (new_tag === Tag.getIdentifier(current_tag)) {
                        this._handleUnexpected();
                    }
                }

                this._tokens.next();

                current = this._tokens.peek();
                if (current.is('sym', '=')) {
                    this._tokens.next();

                    current = this._tokens.peek();
                    if (current.is('key', 'function')) {
                        this._tokens.next();

                        const call = this._readFunctionCall();

                        this._astree.enterSetAndLeave(['functions', global.defaults.alias.tags, new_tag], call);
                        func_tag = true;
                    } else if (current.is('key', 'none')) {
                        this._tokens.next();
                    } else {
                        const value = this._readString({ allow_dynamic: true });
                        if (value === undefined) {
                            this._handleUnexpected();
                        }
                        
                        new_tag = Tag.getTag(new_tag, value);
                    }
                }
            } else if (current.is('key')) {
                new_tag = Tag.getTag('@' + current.val);

                this._tokens.next();
            }

            if (!func_tag) {
                tags.push(new_tag);
            }

            current = this._tokens.peek();
            if (current.is('sym', ',')) {
                this._tokens.next();
            }

            current = this._tokens.peek();
        }
    
        return tags;
    }

    _readWhileUntag() {
        const tags = [ ];

        let current = this._tokens.peek();
        while (current.isTagsetToken()) {
            let new_tag = current.val;

            if (current.is('tag')) {
                // There is no reason one would want to post duplicate tags in the same module.
                // Allowing it would only lead to wasted CPU cycles when evaluating tags inside context expressions against the modules.
                for (const current_tag of tags) {
                    if (new_tag === Tag.getIdentifier(current_tag)) {
                        this._handleUnexpected();
                    }
                }

                this._tokens.next();
            }

            current = this._tokens.peek();
            if (current.is('sym', ',')) {
                this._tokens.next();
            }

            current = this._tokens.peek();
        }
    
        return tags;
    }

    _handleTagsDefinition(opts = { }) {
        opts.require = opts.require ?? false;
        opts.untag   = opts.untag   ?? false;

        let tags;
        if (opts.untag) {
            tags = this._readWhileUntag();
        } else {
            tags = this._readWhileTag();
        }
        if (!common.isEmpty(tags)) {
            this._astree.enterSetAndLeave(['definition', global.defaults.alias.tags], tags);
        } else if (opts.require) {
            this._handleUnexpected();
        }
    }

    _handleTypeDefinitionImplicit() {
        this._astree.enterPos('definition');

        const tags = this._astree.enterGetAndLeave(global.defaults.alias.tags);
        if (!common.isEmpty(tags)) {
            this._astree.enterSetAndLeave(global.defaults.alias.type, Tag.getIdentifier(tags[tags.length - 1]));
        }

        this._astree.leavePos();
    }

    async _handleTypeDefinitionExplicit() {
        if (this._tokens.peek().is('key', 'function')) {
            this._tokens.next();

            const call = this._readFunctionCall();

            this._astree.enterSetAndLeave(['functions', global.defaults.alias.type], call);
        } else {
            const type = await this._readWhileRawAndParse({ primitive_only: true });
            if (type === undefined) {
                this._handleUnexpected();
            }

            this._astree.enterSetAndLeave(['definition', global.defaults.alias.type], type);
        }
    }

    async _handleStateDefinition() {
        if (this._tokens.peek().is('key', 'function')) {
            this._tokens.next();

            const call = this._readFunctionCall();

            this._astree.enterSetAndLeave(['functions', global.defaults.alias.state], call);
        } else {
            const free = await this._readWhileRawAndParse({ primitive_only: false });
            if (free === undefined) {
                this._handleUnexpected();
            }
    
            this._astree.enterSetAndLeave(['definition', global.defaults.alias.state], free);
        }
    }

    async _handleNestedDefinition() {
        if (this._tokens.peek().is('key', 'none')) {
            this._tokens.next();
        } else {
            if (!this._tokens.peek().is('sym', '{')) {
                this._handleUnexpected();
            }
            this._astree.enterNested();
            this._tokens.next();

            while (!this._tokens.peek().is('sym', '}')) {
                await this._handleStatement();
            }
            this._astree.leaveNested();
            this._tokens.next();
        }
    }

    async _handleDefinition() {
        // As usual, the grammar of the language is meant to appeal to different styles by offering different options with the same outcome.
        // Here, the user has three possible ways to enter tags: "@tridy @as <tags>", "@as <tags>", or just "<tags>".
        // The first option, for instance, is just an optional way to distinguish it from the raw input (e.g. "@json % ... %") options that specify a format first.
        if (this._tokens.peek().is('key', 'tridy')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'as')) {
                this._tokens.next();

                if (this._tokens.peek().is('key', 'none')) {
                    this._tokens.next();
                } else {
                    this._handleTagsDefinition({ require: true });
                }
            }

            if (this._tokens.peek().is('key', 'of')) {
                this._tokens.next();

                if (this._tokens.peek().is('key', 'none')) {
                    this._tokens.next();
                } else {
                    await this._handleTypeDefinitionExplicit();
                }
            }
        } else if (this._tokens.peek().is('key', 'as')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                this._handleTagsDefinition({ require: true });
            }

            if (this._tokens.peek().is('key', 'of')) {
                this._tokens.next();
    
                if (this._tokens.peek().is('key', 'none')) {
                    this._tokens.next();
                } else {
                    await this._handleTypeDefinitionExplicit();
                }
            }
        } else if (this._tokens.peek().is('key', 'of')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                await this._handleTypeDefinitionExplicit();
            }
        } else {
            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                this._handleTagsDefinition({ require: false });
            }

            this._handleTypeDefinitionImplicit();
        }

        if (this._tokens.peek().is('key', 'is')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                await this._handleStateDefinition();
            }
        }

        if (this._tokens.peek().is('key', 'has')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                await this._handleNestedDefinition();
            }
        }

    }

    async _handleEditDefinition() {
        if (this._tokens.peek().is('key', 'as')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.tags], true);
            } else {
                this._handleTagsDefinition({ require: true });
            }
        }

        if (this._tokens.peek().is('key', 'of')) {
            this._tokens.next();
    
            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.type], true);
            } else {
                await this._handleTypeDefinitionExplicit();
            }
        }

        if (this._tokens.peek().is('key', 'is')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.state], true);
            } else {
                await this._handleStateDefinition();
            }
        }

        if (this._tokens.peek().is('key', 'has')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.nested], true);
            } else {
                await this._handleNestedDefinition();
            }
        }
    }

    _handleCopyOperation() {
        const cut = this._tokens.next().is('key', OPERATION_MAP.TEXT.CUT);

        /**
         * The first sub-operation, _save, is done with respect to the context expression specified after the operation, not before.
         * The context was already set to the one before by default to the one given after @in, so we have to switch them out.
         * Luckily, the first line in this block already captures the original expression, so we don't need to worry about overriding.
         */
        const target = this._astree.enterGetAndLeave('context');
        this._astree.enterDeleteAndLeave('context');
        if (this._tokens.peek().isContextToken()) {
            this._handleContext();
        }
        const source = this._astree.enterGetAndLeave('context');
        this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.CLIPBOARD_IN);
        this._astree.nextItem();

        if (cut) {
            this._astree.enterSetAndLeave('context', source);
            this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.DELETE);
            this._astree.nextItem();
        }

        this._astree.enterSetAndLeave('context', target);
        this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.CLIPBOARD_OUT);
    }

    async _handleReadParameters() {
        let current;

        this._astree.enterPos('output');

        this._astree.enterSetAndLeave('stmt_nonce', this._stmt_nonce);
        this._astree.enterSetAndLeave('list_nonce', this._list_nonce);

        current = this._tokens.peek();
        if (current.is('key', 'indent')) {
            this._tokens.next();

            current = this._tokens.peek();
            if (current.is('key', 'none')) {
                this._astree.enterSetAndLeave('indent', -1);
            } else if (current.is('tag')) {
                const value = Number(current.val);
                if (!Number.isInteger(value)) {
                    this._handleUnexpected();
                }
    
                this._astree.enterSetAndLeave('indent', value);
            } else {
                this._handleUnexpected();
            }

            this._tokens.next();
        }

        let force_complex = false;
        let force_text    = false;

        current = this._tokens.peek();
        if (current.is('key', 'raw')) {
            force_complex = true;
            this._astree.enterSetAndLeave('compression', 0);
            
            this._tokens.next();
        } else if (current.is('key', 'typeless')) {
            force_complex = true;
            this._astree.enterSetAndLeave('compression', 1);

            this._tokens.next();
        } else if (current.is('key', 'tagless')) {
            force_complex = true;
            this._astree.enterSetAndLeave('compression', 2);

            this._tokens.next();
        } else if (current.is('key', 'trimmed')) {
            force_complex = true;
            this._astree.enterSetAndLeave('compression', 3);

            this._tokens.next();
        } else if (current.is('key', 'merged')) {
            force_complex = true;
            this._astree.enterSetAndLeave('compression', 4);

            this._tokens.next();
        } else if (current.is('key', 'final')) {
            force_complex = true;
            this._astree.enterSetAndLeave('compression', 5);

            this._tokens.next();
        }

        current = this._tokens.peek();
        if (current.is('key', 'json')) {
            this._astree.enterSetAndLeave('format', 'json');
            
            this._tokens.next();
        } else if (current.is('key', 'yaml')) {
            this._astree.enterSetAndLeave('format', 'yaml');

            this._tokens.next();
        } else if (current.is('key', 'xml')) {
            this._astree.enterSetAndLeave('format', 'xml');

            this._tokens.next();
        } else if (!force_complex) {
            if (current.is('key', 'simple')) {
                this._tokens.next();

                current = this._tokens.peek();
                if (current.is('key', 'text')) {
                    force_text = true;
                    this._astree.enterSetAndLeave('format', 'simple-text');
                    
                    this._tokens.next();
                }
            } else if (current.is('key', 'nested')) {
                this._tokens.next();

                current = this._tokens.peek();
                if (current.is('key', 'text')) {
                    force_text = true;
                    this._astree.enterSetAndLeave('format', 'nested-text');
                    
                    this._tokens.next();
                }
            }
        }

        if (!force_text) {
            current = this._tokens.peek();
            if (current.is('key', 'list')) {
                this._astree.enterSetAndLeave('list_mode', 'list_only');
                
                this._tokens.next();
            } else if (current.is('key', 'items')) {
                this._astree.enterSetAndLeave('list_mode', 'items_only');
                
                this._tokens.next();
            }
        }

        let force_file = false;

        current = this._tokens.peek();
        if (current.is('key', 'create')) {
            force_file = true;
            this._astree.enterSetAndLeave('file_mode', 'create');
            
            this._tokens.next();
        } else if (current.is('key', 'append')) {
            force_file = true;
            this._astree.enterSetAndLeave('file_mode', 'append');
            
            this._tokens.next();
        } else if (current.is('key', 'replace')) {
            force_file = true;
            this._astree.enterSetAndLeave('file_mode', 'replace');

            this._tokens.next();
        }

        if (force_file) {
            current = this._tokens.peek();
            if (current.is('key', 'file')) {
                this._tokens.next();

                const link = await this._readString({ allow_dynamic: false });
                if (link === undefined) {
                    this._handleUnexpected();
                }

                this._astree.enterSetAndLeave('file', link);
            }

            current = this._tokens.peek();
            if (current.is('key', 'quiet')) {
                this._astree.enterSetAndLeave('file_quiet', true);

                this._tokens.next();
            }
        }

        this._astree.leavePos();
    }

    async _handleImportParameters() {
        const imported = await this._readFileImport();

        const handler = new Tridy();
        const output  = await handler.query(imported.content, {
            tokenless:    false,
            accept_carry: false,
            filepath:     imported.link,
            astree_only:  true
        });
        
        if (!common.isEmpty(output[global.defaults.alias.nested])) {
            this._astree.enterSetAndLeave(global.defaults.alias.nested, output[global.defaults.alias.nested]);
        }
    }

    async _handleOperation() {
        const operation_token = this._tokens.peek();

        if (operation_token.isDefiningOpToken()) {
            if (operation_token.is('key', OPERATION_MAP.TEXT.OVERWRITE)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.OVERWRITE);
            } else if (operation_token.is('key', OPERATION_MAP.TEXT.APPEND)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.APPEND);
            }

            this._tokens.next();
            
            if (this._tokens.peek().isRawInputStartToken()) {
                await this._handleRawDefinition();
            } else {
                await this._handleDefinition();
            }
        } else if (operation_token.isAffectingOpToken()) {
            if (operation_token.is('key', OPERATION_MAP.TEXT.PRINT)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.PRINT);
            } else if (operation_token.is('key', OPERATION_MAP.TEXT.DELETE)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.DELETE);
            } else if (operation_token.is('key', OPERATION_MAP.TEXT.PRINT_STATISTICS)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.NOP);
            }

            this._tokens.next();

            if (!this._context_defined) {
                if (this._tokens.peek().isContextToken()) {
                    this._handleContext();
                    this._context_defined = true;
                }

                this._handleContextAppendixNotRequiringExpression();
            }

            if (operation_token.isReadOpToken()) {
                await this._handleReadParameters();
            }
        } else if (operation_token.isEditingOpToken()) {
            if (operation_token.is('key', OPERATION_MAP.TEXT.EDIT)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.EDIT);
            } else if (operation_token.is('key', OPERATION_MAP.TEXT.EDIT_TAGS)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.EDIT_TAGS);
            } else if (operation_token.is('key', OPERATION_MAP.TEXT.DELETE_TAGS)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.DELETE_TAGS);
            }

            this._tokens.next();

            if (operation_token.isGeneralEditingOpToken()) {
                await this._handleEditDefinition();
            } else if (operation_token.isTagEditingOpToken()) {
                if (this._tokens.peek().is('key', 'as')) {
                    this._tokens.next();
                }

                if (operation_token.is('key', OPERATION_MAP.TEXT.EDIT_TAGS)) {
                    this._handleTagsDefinition({ require: false, untag: false });
                } else if (operation_token.is('key', OPERATION_MAP.TEXT.DELETE_TAGS)) {
                    this._handleTagsDefinition({ require: false, untag: true });
                }
            }
        } else if (operation_token.isCopyOpToken()) {
            this._handleCopyOperation();
        } else if (operation_token.isImportOpToken()) {
            if (operation_token.is('key', OPERATION_MAP.TEXT.IMPORT)) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.MULTIPLE);
            }

            this._tokens.next();

            await this._handleImportParameters();
        } else if (!operation_token.is('sym', ';')) {
            this._handleUnexpected();
        }
    }

    async _handleStatement() {
        if (this._tokens.peek().isControlOpToken()) {
            this._handleControlOperation();
        } else {
            /**
             * '@in' should be required to give a context expression with some operations.
             * Some operations like '@new' and '@set' create new modules, so they need the space to the right of them to detail these newly created modules.
             * It would nonetheless be possible merge context expressions and tag definitions.
             * However, it gets complicated when you want something like ''@new' a/b' when a doesn't exist yet, or ''@new' a/b|(b/c)'.
             * Meanwhile ''@get' a/b' works because you know you're only addressing an existing module with it.
             */
            this._context_defined = false;

            if (this._tokens.peek().is('key', 'in')) {
                this._tokens.next();

                this._handleContext();
                this._context_defined = true;

                this._handleContextAppendixNotRequiringExpression();

                if (this._tokens.peek().is('sym', ';')) {
                    this._handleUnexpected();
                }
            }

            if (this._tokens.peek().is('sym', '{')) {
                this._astree.enterSetAndLeave('operation', OPERATION_MAP.ASTREE.MULTIPLE);
                
                this._tokens.next();
                this._astree.enterNested();
                while (!this._tokens.peek().is('sym', '}')) {
                    this._handleStatement();
                }
                this._astree.leaveNested();
                this._tokens.next();
            } else {
                await this._handleOperation();
            }
        }

        if (!this._tokens.peek().is('sym', ';')) {
            this._handleUnexpected();
        }

        this._tokens.next();

        this._astree.nextItem();

        this._stmt_nonce++;
    }

    async parse(tokens, opts = { }) {
        this._tokens = new List(tokens);

        this._astree = new StateTree();

        this._astree.enterNested();
        while (!this._tokens.isEnd() && (global.flags.exit !== true)) {
            await this._handleStatement();
        }
        this._astree.leaveNested();

        return this._astree.getRaw();
    }
}
