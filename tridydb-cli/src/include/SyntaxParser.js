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
        switch (token.orig.type) {
            case 'key':
                throw new SyntaxError(`line ${token.pos.line}, col ${token.pos.col}: Unexpected keyword "${token.orig.val}".`);
            default:
                throw new SyntaxError(`line ${token.pos.line}, col ${token.pos.col}: Unexpected token "${token.orig.val}".`);
        }
    }

    readWhileContextExpressionTerminal() {
        let context = [ ];

        let current = this.tokens.peek();
        current.toContextToken();
        if (current.is('t')) {
            context.push(current);

            this.tokens.next();
            current = this.tokens.peek();
            current.toContextToken();
            while (current.is('t')) {
                context.push(new Token('o', '&'));
                context.push(current);

                this.tokens.next();
                current = this.tokens.peek();
                current.toContextToken();
            }
        }

        return context;
    }

    handleWhileUnaryOpContextTokens(context) {
        let current = this.tokens.peek();
        current.toContextToken();
        while (current.isUnaryOpContextToken()) {
            context.push(current);

            this.tokens.next();
            current = this.tokens.peek();
            current.toContextToken();
        }
    }
    
    handleBinaryOpContextToken(context) {
        const isPreviousTaglikeContextToken = () => {
            return (!isEmpty(context) && ((context[context.length - 1].is('t')) || (context[context.length - 1].is('o', ')'))));
        }

        if (isPreviousTaglikeContextToken()) {
            const current = this.tokens.peek();
            current.toContextToken();
            context.push(current);
            this.tokens.next();
        } else {
            this.handleUnexpected();
        }
    }

    handleContextSubExpression(context) {
        let is_enclosed = false;

        let current;

        this.handleWhileUnaryOpContextTokens(context);

        current = this.tokens.peek();
        current.toContextToken();
        if (current.is('o', '(')) {
            context.push(current);
            this.tokens.next();
            
            is_enclosed = true;
        }
        
        this.handleWhileUnaryOpContextTokens(context);

        let sub;
        let runs = 0;
        while (true) {
            sub = this.readWhileContextExpressionTerminal();
            if (isEmpty(sub)) {
                current = this.tokens.peek();
                current.toContextToken();
                if (current.isUnaryOpContextToken() || current.is('o', '(')) {
                    if (runs > 0) {
                        context.push(new Token('o', '&'));
                    }

                    sub = this.readWhileContextExpression();
                } else if (current.isBinaryOpContextToken()) {
                    this.handleBinaryOpContextToken(context);
                    
                    sub = this.readWhileContextExpression();
                }
            }
            
            for (const token of sub) {
                context.push(token);
            }

            if (isEmpty(sub)) {
                break;
            } else {
                runs++;
            }
        }

        if (runs === 0) {
            this.handleUnexpected();
        }

        if (is_enclosed) {
            current = this.tokens.peek();
            current.toContextToken();
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

        this.handleContextSubExpression(context);

        let current = this.tokens.peek();
        current.toContextToken();
        while (current.isBinaryOpContextToken()) {
            this.handleBinaryOpContextToken(context);
            this.handleContextSubExpression(context);

            current = this.tokens.peek();
            current.toContextToken();
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

        if (this.tokens.peek().is('punc', ';')) {
            this.tokens.next();

            return;
        }

        if (this.tokens.peek().is('key', 'get') || this.tokens.peek().is('key', 'del')) {
            this.handleOperation();

            if (!this.tokens.peek().is('punc', ';')) {
                this.handleContext();
            }
        } else {
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
