import * as yaml from 'js-yaml';

import { parser as infixParser } from './InfixParser.js';
import { StateTree }             from './StateTree.js';
import { Token }                 from './Token.js';

import { global, isEmpty, parseDynamic } from '../utility/common.js';
import { SyntaxError }                   from '../utility/error.js';

class SyntaxParser {
    constructor() { }

    _handleUnexpected(token = null) {
        token = token ?? this._tokens.peek();
        switch (token.debug.type) {
            case 'key':
                throw new SyntaxError(`line ${token.debug.line}, col ${token.debug.col}: Unexpected clause "@${token.debug.val}".`);
            default:
                throw new SyntaxError(`line ${token.debug.line}, col ${token.debug.col}: Unexpected token "${token.debug.val}".`);
        }
    }

    // The operator given below is what the parser assumes the user means when two operands are separated by no operand other than a whitespace.
    // Why is this chosen? Semantically, the assumption is that if a module is described with two words (tags) alone, then it should match both.
    _getContextImplicitBinaryOp () {
        return new Token('o', '&');
    }

    _handleWhileContextTerminal(context) {
        let current = this._tokens.peek().toContextToken();

        if (current.is('t')) {
            context.push(current);
            this._tokens.next();

            current = this._tokens.peek().toContextToken();
        }

        while (current.is('t')) {
            context.push(this._getContextImplicitBinaryOp());
            context.push(current);
            this._tokens.next();

            current = this._tokens.peek().toContextToken();
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
        return (!isEmpty(context) && context[context.length - 1].isExpressionEnderContextToken());
    }
    
    _handleContextBinaryOp(context) {
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

                if (current.is('t')) {
                    this._handleWhileContextTerminal(context);
                } else if (current.isUnaryOpContextToken() || current.is('o', '(')) {
                    this._handleContextExpressionOuter(context);
                }
            } else if (current.isBinaryOpContextToken()) {
                this._handleContextBinaryOp(context);
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
        if (current.is('o', '(')) {
            context.push(current);
            this._tokens.next();
            
            is_enclosed = true;
        }
        
        this._handleContextExpressionInner(context);

        if (is_enclosed) {
            current = this._tokens.peek().toContextToken();
            if (!current.is('o', ')')) {
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
                this._handleContextBinaryOp(context);
                this._handleContextExpressionOuter(context);
            } else {
                break;
            }
        }

        return context;
    }
    
    _handleContext() {
        let context = this._readWhileContextExpression();
        if (isEmpty(context)) {
            this._handleUnexpected();
        }

        // The context expression has to be converted to a tree format before it can be useable, which is a multi-step process handled by a separate parser.
        // It would be even more difficult to parse it in the same human-readable format (as an "infix" array).
        context = infixParser.parse(context);
    
        this._astree.enterSetAndLeave(['context', 'expression'], context);
    }

    _readWhileRaw(opts = { }) {
        opts.multiline = opts.multiline ?? false;

        let line = 0;
        let data = '';

        if (!this._tokens.peek().isRawInputStringToken()) {
            return null;
        }

        do {
            /**
             * With certain formats like YAML that are whitespace-sensitive, the line feed needs to be respected so the indentation is as well.
             * If there are multiple "part" tokens, this function assumes each is equivalent to one line.
             * This is because if the user is entering the a multi-line string in a special format, the tokenizer will produce a new "part" token for every line until it receives a token with the clause "@end".
             * There are no other circumstances where two or more consecutive "part" tokens are produced.
             */ 
            if (opts.multiline && (line > 0)) {
                data += "\n";
            }

            data += this._tokens.next().val;

            line++;
        } while (this._tokens.peek().isRawInputStringToken());
    
        return data;
    }

    _readWhileRawAndParse(opts = { }) {
        opts.string_only = opts.string_only ?? false;
        /**
         * Note to return undefined when the raw input stream is empty or its value cannot be determined, and avoid returning null under such circumstances.
         * A literal null value can be entered as user input via. dynamic typing, and thus additionally be returned as a non-error output.
         * Undefined would never be returned since JSON does not translate a literal undefined value to a native type, unlike null.
         */

        let type;
        let data;

        const current = this._tokens.peek();
        if (!current.isRawInputToken()) {
            return undefined;
        }

        if (current.is('key')) {
            if (opts.string_only) {
                return undefined;
            }

            this._tokens.next();

            type = current.val;
            data = this._readWhileRaw({ multiline: true });
        } else if (current.is('lpart')) {
            type = 'line';
            data = this._readWhileRaw({ multiline: false });
        } else if (current.is('mlpart')) {
            type = 'multiline';
            data = this._readWhileRaw({ multiline: true });
        } else if (current.is('dynpart')) {
            if (opts.string_only) {
                throw new SyntaxError(`line ${current.debug.line}, col ${current.debug.col}: Using a dynamic (grave accent-marked) string is not allowed here.`);
            }

            type = 'dynamic';
            data = this._readWhileRaw({ multiline: true });
        }

        if (data === null) {
            return undefined;
        }

        if (type === 'line') {
            data = data.replace(/[\f\n\r\v]+/g, '');
        } else if (type === 'dynamic') {
            data = parseDynamic(data);
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
                case 'json':
                    data = JSON.parse(data);
                    if (this._tokens.peek().is('key', 'end')) {
                        this._tokens.next();
                    }
                    break;
                case 'yaml':
                    data = yaml.load(data);
                    if (this._tokens.peek().is('key', 'end')) {
                        this._tokens.next();
                    }
                    break;
                case 'line':
                case 'multiline':
                case 'dynamic':
                    break;
            }
        } catch (err) {
            throw new SyntaxError(err.message);
        }

        return data;
    }

    _handleRawDefinition() {
        const raw = this._readWhileRawAndParse({ string_only: false });
        if (raw === undefined) {
            this._handleUnexpected();
        }
        this._astree.setPosValue(raw);
        this._astree.leavePos();
    }
    
    _handleOperation() {
        const current = this._tokens.next();
        if (current.isDefiningOpToken()) {
            if (current.is('key', 'set')) {
                this._astree.enterSetAndLeave('operation', 'overwrite');
            } else if (current.is('key', 'new')) {
                this._astree.enterSetAndLeave('operation', 'compose');
            }
            
            if (this._tokens.peek().isRawInputToken()) {
                this._astree.enterPos('raw');
            } else {
                this._astree.enterPos('definition');
            }
        } else if (current.isAffectingOpToken()) {
            if (current.is('key', 'get')) {
                this._astree.enterSetAndLeave('operation', 'print');
            } else if (current.is('key', 'del')) {
                this._astree.enterSetAndLeave('operation', 'delete');
            }
        } else if (current.isEditingOpToken()) {
            if (current.is('key', 'put')) {
                this._astree.enterSetAndLeave('operation', 'edit');
            } else if (current.is('key', 'tag')) {
                this._astree.enterSetAndLeave('operation', 'tag');
            } else if (current.is('key', 'untag')) {
                this._astree.enterSetAndLeave('operation', 'untag');
            }

            this._astree.enterPos('definition');
        } else {
            this._handleUnexpected(current);
        }
    }

    _readWhileTag() {
        const tags = [ ];

        let current = this._tokens.peek();
        while (current.isTagsetToken()) {
            // There is no reason one would want to post duplicate tags in the same module.
            // Allowing it would only lead to wasted CPU cycles when evaluating tags inside context expressions against the modules.
            let new_tag = current.val;
            for (const current_tag of tags) {
                if (new_tag === current_tag) {
                    this._handleUnexpected();
                }
            }

            // When a clause token is produced, the @ at the beginning of it is lost.
            // To continue distinguishing it from regular tags here, it is added back.
            // It is assumed that the outer if-statement will filter out clauses that can't perform as tags.
            if (current.is('key')) {
                current.val = '@' + current.val;
            }

            tags.push(current.val);

            this._tokens.next();

            current = this._tokens.peek();
        }
    
        return tags;
    }

    _handleTagsDefinition(opts = { }) {
        opts.require = opts.require ?? false;

        const tags = this._readWhileTag();
        if (!isEmpty(tags)) {
            this._astree.enterSetAndLeave(global.defaults.alias.tags, tags);
        } else if (opts.require) {
            this._handleUnexpected();
        }
    }

    _handleTypeDefinitionImplicit() {
        const tags = this._astree.enterGetAndLeave(global.defaults.alias.tags);
        if (!isEmpty(tags)) {
            this._astree.enterSetAndLeave(global.defaults.alias.type, tags[tags.length - 1]);
        }
    }

    _handleTypeDefinitionExplicit() {
        const type = this._readWhileRawAndParse({ string_only: true });
        if (type === undefined) {
            this._handleUnexpected();
        }
        this._astree.enterSetAndLeave(global.defaults.alias.type, type);
    }

    _handleStateDefinition() {
        const free = this._readWhileRawAndParse({ string_only: false });
        if (free === undefined) {
            this._handleUnexpected();
        }
        this._astree.enterSetAndLeave(global.defaults.alias.state, free);
    }

    _handleNestedDefinition() {
        if (this._tokens.peek().is('key', 'none')) {
            this._tokens.next();
        } else {
            if (!this._tokens.peek().is('punc', '{')) {
                this._handleUnexpected();
            }
            this._astree.enterNested();
            this._tokens.next();

            while (!this._tokens.peek().is('punc', '}')) {
                this._handleStatement();
            }
            this._astree.leaveNested();
            this._tokens.next();
        }
    }

    _handleDefinition() {
        // As usual, the grammar of the language is meant to appeal to different styles by offering different options with the same outcome.
        // Here, the user has three possible ways to enter tags: "@tridy @as <tags>", "@as <tags>", or just "<tags>".
        // The first option, for instance, is just an optional way to distinguish it from the raw input (e.g. "@json ... @end") options that specify a format first.
        if (this._tokens.peek().is('key', 'tridy')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'of')) {
                this._tokens.next();

                if (this._tokens.peek().is('key', 'none')) {
                    this._tokens.next();
                } else {
                    this._handleTypeDefinitionExplicit();
                }
            }

            if (this._tokens.peek().is('key', 'as')) {
                this._tokens.next();

                if (this._tokens.peek().is('key', 'none')) {
                    this._tokens.next();
                } else {
                    this._handleTagsDefinition({ require: true });
                }
            }
        } else if (this._tokens.peek().is('key', 'of')) {
            this._tokens.next();
    
            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                this._handleTypeDefinitionExplicit();
            }

            if (this._tokens.peek().is('key', 'as')) {
                this._tokens.next();

                if (this._tokens.peek().is('key', 'none')) {
                    this._tokens.next();
                } else {
                    this._handleTagsDefinition({ require: true });
                }
            }
        } else if (this._tokens.peek().is('key', 'as')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                this._handleTagsDefinition({ require: true });
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
                this._handleStateDefinition();
            }
        }

        if (this._tokens.peek().is('key', 'has')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();
            } else {
                this._handleNestedDefinition();
            }
        }

        this._astree.leavePos();
    }

    _handleEditDefinition() {
        if (this._tokens.peek().is('key', 'of')) {
            this._tokens.next();
    
            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.type], true);
            } else {
                this._handleTypeDefinitionExplicit();
            }
        }
        
        if (this._tokens.peek().is('key', 'as')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.tags], true);
            } else {
                this._handleTagsDefinition({ require: true });
            }
        }

        if (this._tokens.peek().is('key', 'is')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.state], true);
            } else {
                this._handleStateDefinition();
            }
        }

        if (this._tokens.peek().is('key', 'has')) {
            this._tokens.next();

            if (this._tokens.peek().is('key', 'none')) {
                this._tokens.next();

                this._astree.enterSetAndLeave(['nulled', global.defaults.alias.nested], true);
            } else {
                this._handleNestedDefinition();
            }
        }

        this._astree.leavePos();
    }

    _handleStatement() {
        let current;

        if (this._tokens.peek().isControlOpToken()) {
            // As a control statement, the functionality for it is handled directly by the interpreter, and not here.
            // This forces it to be handled from a client's perspective, thus having no effect on a server, other than it being accepted.

            this._tokens.next();  
        } else {
            /**
             * '@in' should be required to give a context expression with some operations.
             * Some operations like '@new' and '@set' create new modules, so they need the space to the right of them to detail these newly created modules.
             * It would nonetheless be possible merge context expressions and tag definitions.
             * However, it gets complicated when you want something like ''@new' a/b' when a doesn't exist yet, or ''@new' a/b|(b/c)'.
             * Meanwhile ''@get' a/b' works because you know you're only addressing an existing module with it.
             */
            let context_defined = false;

            if (this._tokens.peek().is('key', 'in')) {
                this._tokens.next();

                this._handleContext();
                context_defined = true;
            }

            const operation_token = this._tokens.peek();
            
            if (operation_token.isDefiningOpToken()) {
                this._handleOperation();

                switch (this._astree.getTopPos()) {
                    case 'raw':
                        this._handleRawDefinition();
                        break;
                    case 'definition':
                        this._handleDefinition();
                        break;
                }
            } else if (operation_token.isAffectingOpToken()) {
                this._handleOperation();

                if (!context_defined) {
                    current = this._tokens.peek();
                    if (current.isContextToken()) {
                        this._handleContext();
                        context_defined = true;
                    }
                }

                if (operation_token.isReadOpToken()) {
                    current = this._tokens.peek();
                    if (current.is('key', 'raw')) {
                        this._astree.enterSetAndLeave(['compression'], 0);
                        
                        this._tokens.next();
                    } else if (current.is('key', 'typeless')) {
                        this._astree.enterSetAndLeave(['compression'], 1);

                        this._tokens.next();
                    } else if (current.is('key', 'tagless')) {
                        this._astree.enterSetAndLeave(['compression'], 2);

                        this._tokens.next();
                    } else if (current.is('key', 'trimmed')) {
                        this._astree.enterSetAndLeave(['compression'], 3);

                        this._tokens.next();
                    } else if (current.is('key', 'merged')) {
                        this._astree.enterSetAndLeave(['compression'], 4);

                        this._tokens.next();
                    } else if (current.is('key', 'final')) {
                        this._astree.enterSetAndLeave(['compression'], 5);

                        this._tokens.next();
                    }
                }
            } else if (operation_token.isGeneralEditingOpToken()) {
                this._handleOperation();

                this._handleEditDefinition();
            } else if (operation_token.isTagEditingOpToken()) {
                this._handleOperation();

                if (this._tokens.peek().is('key', 'none')) {
                    this._tokens.next();
                } else {
                    this._handleTagsDefinition({ require: false });
                }
            }
    
            current = this._tokens.peek();
            if (current.is('key', 'once')) {
                this._astree.enterSetAndLeave(['context', 'greedy'], true);

                this._tokens.next();
            } else if (current.is('key', 'many')) {
                this._astree.enterSetAndLeave(['context', 'greedy'], false);

                this._tokens.next();
            }
        }

        if (!this._tokens.peek().is('punc', ';')) {
            this._handleUnexpected();
        }

        this._tokens.next();

        this._astree.nextItem();
    }

    parse(input, opts = { }) {
        this._tokens = input;

        this._astree = new StateTree();

        this._astree.enterNested();
        while (!this._tokens.isEnd()) {
            this._handleStatement();
        }
        this._astree.leaveNested();

        return this._astree;
    }
}

export const parser = new SyntaxParser();
