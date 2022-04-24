import * as yaml from 'js-yaml';

import { parser as infixParser } from './InfixParser.js';
import { StateTree }             from './StateTree.js';
import { Token }                 from './Token.js';

import { global, isEmpty } from '../utility/common.js';
import { SyntaxError }     from '../utility/error.js';

class SyntaxParser {
    constructor() { }

    _handleUnexpected() {
        const token = this._tokens.peek();
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

            current = this._tokens.next().toContextToken();
        }

        while (current.is('t')) {
            context.push(this._getContextImplicitBinaryOp());
            context.push(current);

            current = this._tokens.next().toContextToken();
        }
    }

    _handleWhileContextUnaryOp(context) {
        let current = this._tokens.peek().toContextToken();

        while (current.isUnaryOpContextToken()) {
            context.push(current);

            current = this._tokens.next().toContextToken();
        }
    }

    _isPreviousContextExpression(context) {
        return (!isEmpty(context) && context[context.length - 1].isExpressionEnderContextToken());
    }
    
    _handleContextBinaryOp(context) {
        if (this._isPreviousContextExpression(context)) {
            const current = this._tokens.peek().toContextToken();
            context.push(current);
            this._tokens.next();
        } else {
            this._handleUnexpected();
        }
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
            if (current.is('o', ')')) {
                context.push(current);
                this._tokens.next();
            } else {
                this._handleUnexpected();
            }
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

        let data = '';
        while (this._tokens.peek().is('part')) {
            /**
             * With certain formats like YAML that are whitespace-sensitive, the line feed needs to be respected so the indentation is as well.
             * If there are multiple "part" tokens, this function assumes each is equivalent to one line.
             * This is because if the user is entering the a multi-line string in a special format, the tokenizer will produce a new "part" token for every line until it receives a token with the clause "@end".
             * There are no other circumstances where two or more consecutive "part" tokens are produced.
             */ 
            if (opts.multiline) {
                data += "\n";
            }

            data += this._tokens.peek().val;

            this._tokens.next();
        }
    
        return data;
    }

    _readWhileRawAndParse() {
        let type;
        let data;

        const current = this._tokens.peek();
        if (current.is('key', 'json')) {
            type = 'json';
            this._tokens.next();
            
            /**
             * Both parsers (JSON and YAML) do their own escaping using the backslash characters.
             * Thus, the backslash characters have to themselves be escaped before they are put them.
             * Note not to be fooled by the escape characters here either; "\\" is one backslash literal.
             */
            data = this._readWhileRaw({ multiline: false }).replace(/\\/g, '\\\\').replace(/^\s+/, '').replace(/\s+$/, '');
        } else if (current.is('key', 'yaml')) {
            type = 'yaml';
            this._tokens.next();

            /**
             * Note for YAML, removing the whitespace at the very beginning is at least an important consideration.
             * Otherwise, if starting on a new line, it may cause the parser to pick up on the initial line feed unexpectedly.
             * Since YAML is whitespace-sensitive, that can end up throwing errors as a result.
             */
            data = this._readWhileRaw({ multiline: true }).replace(/\\/g, '\\\\').replace(/^\s+/, '').replace(/\s+$/gm, '');
        } else {
            return null;
        }
        
        let parsed;
        try {
            switch (type) {
                case 'json':
                    parsed = JSON.parse(data);
                    break;
                case 'yaml':
                    parsed = yaml.load(data);
                    break;
            }
        } catch (err) {
            throw new SyntaxError(err.message);
        }

        if (this._tokens.peek().is('key', 'end')) {
            this._tokens.next();
        }

        return parsed;
    }
    
    _handleOperation() {
        if (this._tokens.peek().is('key', 'set')) {
            this._astree.enterSetAndLeave('operation', 'edit');
            this._tokens.next();

            if (this._tokens.peek().isRawInputToken()) {
                this._astree.enterPos('raw');
            } else {
                this._astree.enterPos('definition');
            }
        } else if (this._tokens.peek().is('key', 'new')) {
            this._astree.enterSetAndLeave('operation', 'module');
            this._tokens.next();

            if (this._tokens.peek().isRawInputToken()) {
                this._astree.enterPos('raw');
            } else {
                this._astree.enterPos('definition');
            }
        } else if (this._tokens.peek().is('key', 'get')) {
            this._astree.enterSetAndLeave('operation', 'print');
            this._tokens.next();
        } else if (this._tokens.peek().is('key', 'del')) {
            this._astree.enterSetAndLeave('operation', 'delete');
            this._tokens.next();
        } else {
            this._handleUnexpected();
        }
    }

    _readWhileTag() {                            
        const tags = [ ];

        let current = this._tokens.peek();
        while (true) {
            if (current.is('tag') || current.is('key', 'uuid')) {
                let new_tag = this._tokens.peek().val;

                // There is no reason one would want to post duplicate tags in the same module.
                // Allowing it would only lead to wasted CPU cycles when evaluating tags inside context expressions against the modules.
                for (const current_tag of tags) {
                    if (new_tag == current_tag) {
                        this._handleUnexpected();
                    }
                }

                // When a clause token is produced, the @ at the beginning of it is lost.
                // To continue distinguishing it from regular tags here, it is added back.
                // It is assumed that the outer if-statement will filter out clauses that can't perform as tags.
                if (current.is('key')) {
                    new_tag = '@' + new_tag;
                }

                tags.push(new_tag);
                
                this._tokens.next();
            } else {
                break;
            }

            current = this._tokens.peek();
        }
    
        return tags;
    }

    _handleTagsDefinition(opts = { }) {
        opts.require = opts.require ?? false;

        if (this._tokens.peek().is('key', 'none')) {
            this._tokens.next();
        } else {
            const tags = this._readWhileTag();
            if (!isEmpty(tags)) {
                this._astree.enterSetAndLeave(global.defaults.alias.tags, tags);
            } else if (opts.require) {
                this._handleUnexpected();
            }
        }
    }

    _handleStateDefinition() {
        if (this._tokens.peek().is('key', 'none')) {
            this._tokens.next();
        } else {
            const free = this._readWhileRawAndParse();
            if (free === null) {
                this._handleUnexpected();
            } else {
                this._astree.enterSetAndLeave(global.defaults.alias.state, free);
            }
        }
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

            if (this._tokens.peek().is('key', 'as')) {
                this._tokens.next();

                this._handleTagsDefinition({ require: true });
            }
        } else if (this._tokens.peek().is('key', 'as')) {
            this._tokens.next();

            this._handleTagsDefinition({ require: true });
        } else {
            this._handleTagsDefinition({ require: false });
        }

        if (this._tokens.peek().is('key', 'is')) {
            this._tokens.next();

            this._handleStateDefinition();
        }

        if (this._tokens.peek().is('key', 'has')) {
            this._tokens.next();

            this._handleNestedDefinition();
        }

        this._astree.leavePos();
    }

    _handleRawDefinition() {
        this._astree.setPosValue(this._readWhileRawAndParse());
        this._astree.leavePos();
    }

    _handleStatement(token) {
        if (this._tokens.peek().isControlOpToken()) {
            // As a control statement, the functionality for it is handled directly by the interpreter, and not here.
            // This forces it to be handled from a client's perspective, thus having no effect on a server, other than it being accepted.

            this._tokens.next();  
        } else {
            if (this._tokens.peek().isAffectingOpToken()) {
                this._handleOperation();
    
                if (!this._tokens.peek().is('punc', ';')) {
                    this._handleContext();
                }
            } else if (this._tokens.peek().isDefiningOpToken() || this._tokens.peek().is('key', 'in')) {
                /**
                 * '@in' should be required to give a context expression with some operations.
                 * Some operations like '@new' and '@set' create new modules, so they need the space to the right of them to detail these newly created modules.
                 * It would nonetheless be possible merge context expressions and tag definitions.
                 * However, it gets complicated when you want something like ''@new' a/b' when a doesn't exist yet, or ''@new' a/b|(b/c)'.
                 * Meanwhile ''@get' a/b' works because you know you're only addressing an existing module with it.
                 */

                if (this._tokens.peek().is('key', 'in')) {
                    this._tokens.next();
    
                    this._handleContext();
                }
    
                this._handleOperation();
    
                switch (this._astree.getTopPos()) {
                    case 'raw':
                        this._handleRawDefinition();
                        break;
                    case 'definition':
                        this._handleDefinition();
                        break;
                }
            }
    
            if (this._tokens.peek().is('key', 'once')) {
                this._tokens.next();
    
                this._astree.enterSetAndLeave(['context', 'greedy'], true);
            } else if (this._tokens.peek().is('key', 'many')) {
                this._tokens.next();
    
                this._astree.enterSetAndLeave(['context', 'greedy'], false);
            }
        }

        if (this._tokens.peek().is('punc', ';')) {
            this._astree.nextItem();

            this._tokens.next();
        } else {
            this._handleUnexpected();
        }
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
