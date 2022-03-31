import { parser as infixParser } from './InfixParser.js';
import { StateTree }             from './StateTree.js';
import { parser as tokenParser } from './TokenParser.js';

import { alias, isEmpty } from '../utility/common.js';
import { SyntaxError }    from '../utility/error.js';

export let interactive_exit = false;

class InputParser {
    carry      = [ ];
    last_depth = 0;
    last_ended = false;

    constructor() {
        this.parser       = tokenParser;
        this.infix_parser = infixParser;
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

    carryIsEmpty() {
        return this.carry.length === 0;
    }

    parse(opts = { }) {
        opts.accept_carry = opts.accept_carry ?? false;

        const tokens = [ ];

        const parseTokens = () => {
            const isToken = (token, type = null, value = null) => {
                return (((token.type == type) || (type === null)) && ((token.val == value) || (value === null)));
            }

            const parseTokensWithCarry = () => {
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
                for (idx = this.carry.length; idx < pool.length; idx++) {
                    if (isToken(pool[idx], 'punc', '{')) {
                        this.last_depth++;
                    } else if (isToken(pool[idx], 'punc', '}')) {
                        this.last_depth--;

                        if (this.last_depth < 0) {
                            throw new SyntaxError(`line ${pool[idx].pos.line}, col ${pool[idx].pos.col}: Unexpected token "}".`);
                        }
                    }

                    if (isToken(pool[idx], 'punc', ';')) {
                        this.last_ended = true;
                    } else {
                        this.last_ended = false;
                    }

                    if (this.last_ended && this.last_depth === 0) {
                        stmt_cutoff = idx;
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
            }

            const parseTokensWithoutCarry = () => {
                let carry_needed = false;

                let token;
                while (token = this.parser.next()) {
                    tokens.push(token);
                    
                    if (isToken(token, 'punc', '{')) {
                        this.last_depth++;
                    } else if (isToken(token, 'punc', '}')) {
                        this.last_depth--;

                        if (this.last_depth < 0) {
                            throw new SyntaxError(`line ${pool[idx].pos.line}, col ${pool[idx].pos.col}: Unexpected token "}".`);
                        }
                    }

                    if (isToken(token, 'punc', ';')) {
                        this.last_ended = true;
                    } else {
                        this.last_ended = false;
                    }

                    if (this.last_ended && this.last_depth === 0) {
                        carry_needed = false;
                    } else {
                        carry_needed = true;
                    }
                }
                
                if (carry_needed) {
                    throw new SyntaxError(`The input given contains an incomplete VMDL statement (missing final ";" or "}").`);
                }
            }

            if (opts.accept_carry) {
                parseTokensWithCarry();
            } else {
                parseTokensWithoutCarry();
            }
        }

        const parseTree = () => {
            const astree = new StateTree();

            let it = 0;

            const currentToken = () => {
                return tokens[it];
            }

            const nextToken = () => {
                if (it < tokens.length) {
                    it++;

                    if (it < tokens.length) {
                        return tokens[it];
                    } else {
                        return null;
                    }
                }
            }

            const hasTokensLeft = () => {
                return it < tokens.length;
            }

            const handleStatement = (token) => {
                const isToken = (type = null, value = null) => {
                    return (((tokens[it].type == type) || (type === null)) && ((tokens[it].val == value) || (value === null)));
                }

                const handleUnexpected = () => {
                    const token = currentToken();
                    switch (token.type) {
                        case 'key':
                            throw new SyntaxError(`line ${token.pos.line}, col ${token.pos.col}: Unexpected keyword "${token.val}".`);
                        default:
                            throw new SyntaxError(`line ${token.pos.line}, col ${token.pos.col}: Unexpected token "${token.val}".`);
                    }
                }
                
                const handleContext = () => {
                    const readWhileContextExpression = () => {
                        const readWhileContextExpressionTerminal = () => {
                            const isTaglikeContextToken = () => {
                                return false ||
                                    isToken('tag') ||
                                    isToken('key', 'any') ||
                                    isToken('punc', '*')
                                ;
                            }
    
                            const handleTaglikeContextToken = () => {
                                const token = currentToken();
                                switch (token.type) {
                                    case 'tag':
                                        context.push({ type: 't', val: currentToken().val });
                                        break;
                                    default:
                                        switch (token.val) {
                                            case 'any':
                                            case '*':
                                                context.push({ type: 't', val: '@any' });
                                                break;
                                        }
                                        break;
                                }
                                nextToken();
                            }
    
                            const context = [ ];
                        
                            if (isTaglikeContextToken()) {
                                handleTaglikeContextToken();
                        
                                while (isTaglikeContextToken()) {
                                    context.push({ type: 'o', val: '&' });
                                    handleTaglikeContextToken();
                                }
                            }
                        
                            return context;
                        }

                        const isUnaryOpContextToken = () => {
                            return false ||
                                isToken('key', 'not') ||
                                isToken('punc', '!')
                            ;
                        }
                        
                        const handleUnaryOpContextToken = () => {
                            switch (currentToken().val) {
                                case 'not':
                                case '!':
                                    context.push({ type: 'o', val: '!' });
                                    break;
                            }
                            nextToken();
                        }
                        
                        const isBinaryOpContextToken = () => {
                            return false ||
                                isToken('key', 'and') ||
                                isToken('punc', '&') ||
                                isToken('key', 'xor') ||
                                isToken('punc', '^') ||
                                isToken('key', 'or') ||
                                isToken('punc', '|') ||
                                isToken('punc', ',') ||
                                isToken('key', 'to') ||
                                isToken('punc', '/') ||
                                isToken('punc', '>') ||
                                isToken('key', 'toward') ||
                                isToken('punc', '>>')
                            ;
                        }
                        
                        const handleBinaryOpContextToken = () => {
                            const isPreviousTaglikeContextToken = () => {
                                return (!isEmpty(context) && ((context[context.length - 1].type == 't') || (context[context.length - 1].val == ')')));
                            }

                            if (!isPreviousTaglikeContextToken()) {
                                handleUnexpected();
                            }

                            switch (currentToken().val) {
                                case 'and':
                                case '&':
                                    context.push({ type: 'o', val: '&' });
                                    break;
                                case 'xor':
                                case '^':
                                    context.push({ type: 'o', val: '^' });
                                    break;
                                case 'or':
                                case '|':
                                case ',':
                                    context.push({ type: 'o', val: '|' });
                                    break;
                                case 'to':
                                case '/':
                                case '>':
                                    context.push({ type: 'o', val: '>' });
                                    break;
                                case 'toward':
                                case '>>':
                                    context.push({ type: 'o', val: '>>' });
                                    break;
                            }
                            nextToken();
                        }

                        const handleContextSubExpression = () => {
                            let is_enclosed = false;

                            while (isUnaryOpContextToken()) {
                                handleUnaryOpContextToken();
                            }
    
                            if (isToken('punc', '(')) {
                                context.push({ type: 'o', val: '(' });
                                nextToken();
                                
                                is_enclosed = true;
                            }
                            
                            while (isUnaryOpContextToken()) {
                                handleUnaryOpContextToken();
                            }

                            let sub;
                            let runs = 0;
                            while (true) {
                                sub = readWhileContextExpressionTerminal();
                                if (isEmpty(sub)) {
                                    if (isUnaryOpContextToken() || isToken('punc', '(')) {
                                        if (runs > 0) {
                                            context.push({ type: 'o', val: '&' });
                                        }

                                        sub = readWhileContextExpression();
                                    } else if (isBinaryOpContextToken()) {
                                        handleBinaryOpContextToken();
                                        
                                        sub = readWhileContextExpression();
                                    }
                                }
                                
                                for (const piece of sub) {
                                    context.push(piece);
                                }

                                if (isEmpty(sub)) {
                                    break;
                                } else {
                                    runs++;
                                }
                            }
    
                            if (runs === 0) {
                                handleUnexpected();
                            }

                            if (is_enclosed) {
                                if (isToken('punc', ')')) {
                                    context.push({ type: 'o', val: ')' });
                                    nextToken();
                                } else {
                                    handleUnexpected();
                                }
                            }
                        }
                        
                        let context = [ ];

                        handleContextSubExpression();
                        while (isBinaryOpContextToken()) {
                            handleBinaryOpContextToken();
                            handleContextSubExpression();
                        }

                        return context;
                    }

                    const toTree = (expression) => {
                        this.infix_parser.load(expression);
                        return this.infix_parser.parse();
                    }

                    let context = readWhileContextExpression();
                    context = toTree(context);

                    if (isEmpty(context)) {
                        handleUnexpected();
                    }
                    
                    astree.enterSetAndLeave(['context'], context);
                }

                const isRawInputToken = () => {
                    switch (currentToken().val) {
                        case 'json':
                            return true;
                        default:
                            return false;
                    }
                }

                const readWhileRaw = () => {
                    let data = '';
                    while (isToken('part')) {
                        data += currentToken().val;

                        nextToken();
                    }
                
                    return data;
                }

                const readWhileRawAndParse = () => {
                    let type;
                    let data;
                    if (isToken('key', 'json')) {
                        type = 'json';
                        nextToken();
                        
                        data = readWhileRaw().replace(/\\/g, '\\\\');
                    } else {
                        handleUnexpected();
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
            
                    if (!isToken('key', 'end')) {
                        handleUnexpected();
                    }
                    nextToken();
            
                    return parsed;
                }
                
                const handleOperation = () => {
                    if (isToken('key', 'set')) {
                        astree.enterSetAndLeave(['operation'], 'edit');
                        nextToken();

                        if (isRawInputToken()) {
                            astree.enterPos('imported');
                        } else {
                            astree.enterPos('definition');
                        }
                    } else if (isToken('key', 'new')) {
                        astree.enterSetAndLeave(['operation'], 'module');
                        nextToken();

                        if (isRawInputToken()) {
                            astree.enterPos('imported');
                        } else {
                            astree.enterPos('definition');
                        }
                    } else if (isToken('key', 'get')) {
                        astree.enterSetAndLeave(['operation'], 'print');
                        nextToken();
                    } else if (isToken('key', 'del')) {
                        astree.enterSetAndLeave(['operation'], 'delete');
                        nextToken();
                    } else {
                        handleUnexpected();
                    }
                }
                
                const handleDefinition = () => {
                    const handleHandleDefinition = () => {
                        if (isToken('key', 'none')) {
                            nextToken();
                        } else if (isToken('tag') || isToken('var')) {
                            const token = currentToken().val;
                            if (isToken('var')) {
                                token = '$' + token;
                            }
                            
                            astree.enterSetAndLeave([alias.handle], token);
                            astree.enterSetAndLeave([alias.tags], [token]);
                    
                            nextToken();
                        } else {
                            handleUnexpected();
                        }
                    }
                
                    const handleTagsDefinition = () => {
                        const readWhileTag = () => {                            
                            const tags = [ ];
                            while (true) {
                                if (isToken('tag') || isToken('var')) {
                                    let new_tag = currentToken().val;
                                    if (isToken('var')) {
                                        new_tag = '$' + new_tag;
                                    }

                                    for (const current_tag of tags) {
                                        if (new_tag == current_tag) {
                                            const token = currentToken();
                                            throw new SyntaxError(`line ${token.pos.line}, col ${token.pos.col}: Duplicate tag "${token.val}".`);
                                        }
                                    }

                                    tags.push(new_tag);
                                    
                                    nextToken();
                                } else {
                                    break;
                                }
                            }
                        
                            return tags;
                        }

                        if (isToken('key', 'none')) {
                            nextToken();

                            astree.enterSetAndLeave([alias.tags], undefined);
                        } else {
                            const tags = readWhileTag();
                
                            if (isEmpty(tags)) {
                                handleUnexpected();
                            }
                    
                            astree.enterSetAndLeave([alias.tags], tags);
                        }
                    }
                
                    const handleStateDefinition = () => {
                        if (isToken('key', 'none')) {
                            nextToken();
                        } else {
                            astree.enterSetAndLeave([alias.state], readWhileRawAndParse());
                        }
                    }
                
                    const handleNestedDefinition = () => {
                        if (isToken('key', 'none')) {
                            nextToken();
                        } else {
                            if (!isToken('punc', '{')) {
                                handleUnexpected();
                            }
                            astree.enterNested();
                            nextToken();
    
                            while (!isToken('punc', '}')) {
                                handleStatement();
                            }
                            astree.leaveNested();
                            nextToken();
                        }
                    }

                    handleHandleDefinition();

                    if (isToken('key', 'as')) {
                        nextToken();

                        handleTagsDefinition();
                    }

                    if (isToken('key', 'is')) {
                        nextToken();

                        handleStateDefinition();
                    }

                    if (isToken('key', 'has')) {
                        nextToken();

                        handleNestedDefinition();
                    }

                    astree.leavePos();
                }

                const handleImported = () => {
                    astree.setPosValue(readWhileRawAndParse());
                    astree.leavePos();
                }

                if (isToken('key', 'tridy')) {
                    nextToken();
                }
                
                if (isToken('key', 'exit')) {
                    interactive_exit = true;
                    nextToken();
                }

                if (isToken('punc', ';')) {
                    nextToken();

                    return;
                }

                if (isToken('key', 'in')) {
                    nextToken();

                    handleContext();
                }

                handleOperation();

                switch (astree.getTopPos()) {
                    case 'imported':
                        handleImported();
                        break;
                    case 'definition':
                        handleDefinition();
                        break;
                }

                if (isToken('punc', ';')) {
                    astree.nextItem();
                    nextToken();
                } else {
                    handleUnexpected();
                }
            }

            astree.enterNested();
            while (hasTokensLeft()) {
                handleStatement();
            }
            astree.leaveNested();

            return astree;
        }

        parseTokens();

        if (isEmpty(this.carry)) {
            this.parser.clear();
        }

        return parseTree();
    }
}

export const parser = new InputParser();
