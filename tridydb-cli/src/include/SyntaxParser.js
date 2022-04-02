import { parser as infixParser } from './InfixParser.js';
import { StateTree }             from './StateTree.js';
import { Token }                 from './Token.js';

import { alias, isEmpty } from '../utility/common.js';
import { SyntaxError }    from '../utility/error.js';

export let interactive_exit = false;

class SyntaxParser {
    constructor() {
        this.infix_parser = infixParser;
    }

    handleUnexpected() {
        const token = this.tokens.peek();
        switch (token.debug.type) {
            case 'key':
                throw new SyntaxError(`line ${token.debug.line}, col ${token.debug.col}: Unexpected keyword "${token.debug.val}".`);
            default:
                throw new SyntaxError(`line ${token.debug.line}, col ${token.debug.col}: Unexpected token "${token.debug.val}".`);
        }
    }

    getContextImplicitBinaryOp () {
        return new Token('o', '&');
    }

    handleWhileContextTerminal(context) {
        let current = this.tokens.peek().toContextToken();

        if (current.is('t')) {
            context.push(current);

            current = this.tokens.next().toContextToken();
        }

        while (current.is('t')) {
            context.push(this.getContextImplicitBinaryOp());
            context.push(current);

            current = this.tokens.next().toContextToken();
        }
    }

    handleWhileContextUnaryOp(context) {
        let current = this.tokens.peek().toContextToken();

        while (current.isUnaryOpContextToken()) {
            context.push(current);

            current = this.tokens.next().toContextToken();
        }
    }

    isPreviousContextExpression(context) {
        return (!isEmpty(context) && context[context.length - 1].isExpressionEnderContextToken());
    }
    
    handleContextBinaryOp(context) {
        if (this.isPreviousContextExpression(context)) {
            const current = this.tokens.peek().toContextToken();
            context.push(current);
            this.tokens.next();
        } else {
            this.handleUnexpected();
        }
    }

    handleContextExpressionInner(context) {
        let current;
        let runs = 0;

        while (true) {
            current = this.tokens.peek().toContextToken();
            if (current.isExpressionStarterContextToken()) {
                if (this.isPreviousContextExpression(context)) {
                    context.push(this.getContextImplicitBinaryOp());
                }

                if (current.is('t')) {
                    this.handleWhileContextTerminal(context);
                } else if (current.isUnaryOpContextToken() || current.is('o', '(')) {
                    this.handleContextExpressionOuter(context);
                }
            } else if (current.isBinaryOpContextToken()) {
                this.handleContextBinaryOp(context);
                this.handleContextExpressionOuter(context);
            } else {
                break;
            }

            runs++;
        }

        if (runs === 0) {
            this.handleUnexpected();
        }
    }

    handleContextExpressionOuter(context) {
        let current;

        this.handleWhileContextUnaryOp(context);

        let is_enclosed = false;

        current = this.tokens.peek().toContextToken();
        if (current.is('o', '(')) {
            context.push(current);
            this.tokens.next();
            
            is_enclosed = true;
        }
        
        this.handleContextExpressionInner(context);

        if (is_enclosed) {
            current = this.tokens.peek().toContextToken();
            if (current.is('o', ')')) {
                context.push(current);
                this.tokens.next();
            } else {
                this.handleUnexpected();
            }
        }
    }

    readWhileContextExpression() {
        let context = [ ];
        let current;

        this.handleContextExpressionOuter(context);

        while (true) {
            current = this.tokens.peek().toContextToken();
            if (current.isExpressionStarterContextToken()) {
                this.handleContextExpressionOuter(context);
            } else if (current.isBinaryOpContextToken()) {
                this.handleContextBinaryOp(context);
                this.handleContextExpressionOuter(context);
            } else {
                break;
            }
        }

        return context;
    }
    
    handleContext() {
        let context = this.readWhileContextExpression();
        if (isEmpty(context)) {
            this.handleUnexpected();
        }

        context = this.infix_parser.parse(context);
    
        this.astree.enterSetAndLeave(['context'], context);
    }

    readWhileRaw() {
        let data = '';
        while (this.tokens.peek().is('part')) {
            data += this.tokens.peek().val;

            this.tokens.next();
        }
    
        return data;
    }

    readWhileRawAndParse() {
        let type;
        let data;
        if (this.tokens.peek().is('key', 'json')) {
            type = 'json';
            this.tokens.next();
            
            data = this.readWhileRaw().replace(/\\/g, '\\\\');
        } else {
            this.handleUnexpected();
        }
        
        let parsed;
        try {
            switch (type) {
                case 'json':
                    parsed = JSON.parse(data);
                    break;
            }
        } catch (err) {
            throw new SyntaxError(err.message);
        }

        if (!this.tokens.peek().is('key', 'end')) {
            this.handleUnexpected();
        }
        this.tokens.next();

        return parsed;
    }
    
    handleOperation() {
        if (this.tokens.peek().is('key', 'set')) {
            this.astree.enterSetAndLeave(['operation'], 'edit');
            this.tokens.next();

            if (this.tokens.peek().isRawInputToken()) {
                this.astree.enterPos('imported');
            } else {
                this.astree.enterPos('definition');
            }
        } else if (this.tokens.peek().is('key', 'new')) {
            this.astree.enterSetAndLeave(['operation'], 'module');
            this.tokens.next();

            if (this.tokens.peek().isRawInputToken()) {
                this.astree.enterPos('imported');
            } else {
                this.astree.enterPos('definition');
            }
        } else if (this.tokens.peek().is('key', 'get')) {
            this.astree.enterSetAndLeave(['operation'], 'print');
            this.tokens.next();
        } else if (this.tokens.peek().is('key', 'del')) {
            this.astree.enterSetAndLeave(['operation'], 'delete');
            this.tokens.next();
        } else {
            this.handleUnexpected();
        }
    }
    
    handleHandleDefinition() {
        if (this.tokens.peek().is('key', 'none')) {
            this.tokens.next();
        } else if (this.tokens.peek().is('tag') || this.tokens.peek().is('var')) {
            const token = this.tokens.peek().val;
            if (this.tokens.peek().is('var')) {
                token = '$' + token;
            }
            
            this.astree.enterSetAndLeave([alias.handle], token);
            this.astree.enterSetAndLeave([alias.tags], [token]);
    
            this.tokens.next();
        } else {
            this.handleUnexpected();
        }
    }

    readWhileTag() {                            
        const tags = [ ];
        while (true) {
            if (this.tokens.peek().is('tag') || this.tokens.peek().is('var')) {
                let new_tag = this.tokens.peek().val;
                if (this.tokens.peek().is('var')) {
                    new_tag = '$' + new_tag;
                }

                for (const current_tag of tags) {
                    if (new_tag == current_tag) {
                        this.handleUnexpected();
                    }
                }

                tags.push(new_tag);
                
                this.tokens.next();
            } else {
                break;
            }
        }
    
        return tags;
    }

    handleTagsDefinition() {
        if (this.tokens.peek().is('key', 'none')) {
            this.tokens.next();

            this.astree.enterSetAndLeave([alias.tags], undefined);
        } else {
            const tags = this.readWhileTag();
            if (isEmpty(tags)) {
                this.handleUnexpected();
            }
    
            this.astree.enterSetAndLeave([alias.tags], tags);
        }
    }

    handleStateDefinition() {
        if (this.tokens.peek().is('key', 'none')) {
            this.tokens.next();
        } else {
            this.astree.enterSetAndLeave([alias.state], this.readWhileRawAndParse());
        }
    }

    handleNestedDefinition() {
        if (this.tokens.peek().is('key', 'none')) {
            this.tokens.next();
        } else {
            if (!this.tokens.peek().is('punc', '{')) {
                this.handleUnexpected();
            }
            this.astree.enterNested();
            this.tokens.next();

            while (!this.tokens.peek().is('punc', '}')) {
                this.handleStatement();
            }
            this.astree.leaveNested();
            this.tokens.next();
        }
    }

    handleDefinition() {
        this.handleHandleDefinition();

        if (this.tokens.peek().is('key', 'as')) {
            this.tokens.next();

            this.handleTagsDefinition();
        }

        if (this.tokens.peek().is('key', 'is')) {
            this.tokens.next();

            this.handleStateDefinition();
        }

        if (this.tokens.peek().is('key', 'has')) {
            this.tokens.next();

            this.handleNestedDefinition();
        }

        this.astree.leavePos();
    }

    handleImported() {
        this.astree.setPosValue(this.readWhileRawAndParse());
        this.astree.leavePos();
    }

    handleStatement(token) {
        if (this.tokens.peek().is('key', 'tridy')) {
            this.tokens.next();
        }
        
        if (this.tokens.peek().is('key', 'exit')) {
            interactive_exit = true;
            this.tokens.next();
        }

        if (this.tokens.peek().isAffectingOpToken()) {
            this.handleOperation();

            if (!this.tokens.peek().is('punc', ';')) {
                this.handleContext();
            }
        } else if (this.tokens.peek().isDefiningOpToken() || this.tokens.peek().is('key', 'in')) {
            if (this.tokens.peek().is('key', 'in')) {
                this.tokens.next();

                this.handleContext();
            }

            this.handleOperation();

            switch (this.astree.getTopPos()) {
                case 'imported':
                    this.handleImported();
                    break;
                case 'definition':
                    this.handleDefinition();
                    break;
            }
        }

        if (this.tokens.peek().is('punc', ';')) {
            this.astree.nextItem();

            this.tokens.next();
        } else {
            this.handleUnexpected();
        }
    }

    parse(input, opts = { }) {
        this.tokens = input;

        this.astree = new StateTree();

        this.astree.enterNested();
        while (!this.tokens.isEnd()) {
            this.handleStatement();
        }
        this.astree.leaveNested();

        return this.astree;
    }
}

export const parser = new SyntaxParser();
