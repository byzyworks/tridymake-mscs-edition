import { parser as tokenParser }  from './TokenParser.js';
import { parser as infixParser }  from './InfixParser.js';
import { StateTree }              from './StateTree.js';
import { isEmpty }                from '../../utility/common.js';
import { SyntaxError }            from '../../utility/error.js';

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
                                    isToken('punc', '*') ||
                                    isToken('key', 'all') ||
                                    isToken('punc', '**') ||
                                    isToken('key', 'leaf') ||
                                    isToken('punc', '***')
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
                                            case 'all':
                                            case '**':
                                                context.push({ type: 't', val: '@all' });
                                                break;
                                            case 'leaf':
                                            case '***':
                                                context.push({ type: 't', val: '@leaf' });
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
                                isToken('key', 'or') ||
                                isToken('punc', '|') ||
                                isToken('punc', ',') ||
                                isToken('key', 'to') ||
                                isToken('punc', '.') ||
                                isToken('punc', '/') ||
                                isToken('key', 'into') ||
                                isToken('punc', ':') ||
                                isToken('punc', '//')
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
                                case 'or':
                                case '|':
                                case ',':
                                    context.push({ type: 'o', val: '|' });
                                    break;
                                case 'to':
                                case '.':
                                case '/':
                                    context.push({ type: 'o', val: '.' });
                                    break;
                                case 'into':
                                case ':':
                                case '//':
                                    context.push({ type: 'o', val: ':' });
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
                        
                    astree.enterPos('context');
                    astree.setPosValue(context);
                    astree.leavePos();
                }
                
                const handleOperation = () => {
                    if (isToken('key', 'set')) {
                        astree.enterPos('operation');
                        astree.setPosValue('overwrite');
                        astree.leavePos();
                        astree.enterPos('imported');
                    } else if (isToken('key', 'put')) {
                        astree.enterPos('operation');
                        astree.setPosValue('overlay');
                        astree.leavePos();
                        astree.enterPos('imported');
                    } else if (isToken('key', 'now')) {
                        astree.enterPos('operation');
                        astree.setPosValue('buildtime');
                        astree.leavePos();
                        astree.enterPos('definition');
                    } else if (isToken('key', 'new')) {
                        astree.enterPos('operation');
                        astree.setPosValue('runtime');
                        astree.leavePos();
                        astree.enterPos('definition');
                    } else if (isToken('key', 'done')) {
                        astree.enterPos('operation');
                        astree.setPosValue('lock');
                        astree.leavePos();
                    } else if (isToken('key', 'get')) {
                        astree.enterPos('operation');
                        astree.setPosValue('print');
                        astree.leavePos();
                    } else if (isToken('key', 'none')) {
                        astree.enterPos('operation');
                        astree.setPosValue('clear');
                        astree.leavePos();
                    } else {
                        handleUnexpected();
                    }
                    nextToken();
                }
                
                const handleDefinition = () => {
                    const handleSysDefinition = () => {
                        if (isToken('tag') || isToken('var')) {
                            const token = currentToken().val;
                            if (isToken('var')) {
                                token = '$' + token;
                            }
                    
                            astree.enterPos('sys');
                            astree.setPosValue(token);
                            astree.leavePos();
                    
                            astree.enterPos('tags');
                            astree.setPosValue([token]);
                            astree.leavePos();
                    
                            nextToken();
                        } else {
                            handleUnexpected();
                        }
                    }

                    const handlePriorityDefinition = () => {
                        const token = currentToken();
                        token.val = Number(token.val);

                        if ((token.type == 'tag') && (!isNaN(token.val))) {
                            astree.enterPos('priority');
                            astree.setPosValue(currentToken().val);
                            astree.leavePos();
                            
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

                        astree.enterPos('tags');
                
                        if (isToken('key', 'none')) {
                            nextToken();
                
                            astree.setPosValue([ ]);
                        } else {
                            const tags = readWhileTag();
                
                            if (isEmpty(tags)) {
                                handleUnexpected();
                            }
                    
                            astree.setPosValue(tags);
                        }
                
                        astree.leavePos();
                    }

                    
                
                    const handleHeapDefinition = () => {
                        const readWhileHeapData = () => {
                            let data = '';
                            while (isToken('part')) {
                                data += currentToken().val;
    
                                nextToken();
                            }
                        
                            return data;
                        }

                        if (isToken('key', 'none')) {
                            nextToken();

                            return;
                        }

                        let type;
                        if (isToken('key', 'json')) {
                            type = 'json';
                        } else {
                            handleUnexpected();
                        }
                        nextToken();

                        const data = readWhileHeapData().replace(/\\/g, '\\\\');;

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

                        astree.enterPos('heap');
                        astree.setPosValue(parsed);
                        astree.leavePos();
                
                        if (!isToken('key', 'end')) {
                            handleUnexpected();
                        }
                        nextToken();
                
                        astree.leavePos();
                    }
                
                    const handleStackDefinition = () => {
                        if (isToken('key', 'none')) {
                            nextToken();

                            return;
                        }

                        if (!isToken('punc', '{')) {
                            handleUnexpected();
                        }
                        astree.enterStack();
                        nextToken();

                        while (!isToken('punc', '}')) {
                            handleStatement();
                        }
                        astree.leaveStack();
                        nextToken();
                    }

                    handleSysDefinition();

                    if (isToken('key', 'at')) {
                        nextToken();

                        handlePriorityDefinition();
                    }

                    if (isToken('key', 'as')) {
                        nextToken();

                        handleTagsDefinition();
                    }

                    if (isToken('key', 'is')) {
                        nextToken();

                        handleHeapDefinition();
                    }

                    if (isToken('key', 'has')) {
                        nextToken();

                        handleStackDefinition();
                    }
                }

                if (isToken('key', 'vmdl')) {
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

                const handleImported = () => {
                    const readWhileImportedData = () => {
                        let data = '';
                        while (isToken('part')) {
                            data += currentToken().val;

                            nextToken();
                        }
                    
                        return data;
                    }

                    if (isToken('key', 'none')) {
                        nextToken();

                        return;
                    }

                    let type;
                    if (isToken('key', 'json')) {
                        type = 'json';
                    } else {
                        handleUnexpected();
                    }
                    nextToken();

                    const data = readWhileImportedData().replace(/\\/g, '\\\\');

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

                    astree.setPosValue(parsed);
            
                    if (!isToken('key', 'end')) {
                        handleUnexpected();
                    }
                    nextToken();
                }

                const handleEpilogue = () => {
                    astree.enterPos('definition');
                    if (isToken('key', 'close')) {
                        nextToken();

                        astree.enterPos('final');
                        astree.setPosValue(true);
                        astree.leavePos();
                    } else if (isToken('key', 'open')) {
                        nextToken();

                        astree.enterPos('final');
                        astree.setPosValue(false);
                        astree.leavePos();
                    }
                    astree.leavePos();
                }

                handleOperation();

                switch (astree.getTopPos()) {
                    case 'definition':
                        handleDefinition();
                        break;
                    case 'imported':
                        handleImported();
                        break;
                }

                handleEpilogue();

                if (isToken('punc', ';')) {
                    astree.nextItem();
                    nextToken();
                } else {
                    handleUnexpected();
                }
            }

            astree.enterStack();
            while (hasTokensLeft()) {
                handleStatement();
            }
            astree.leaveStack({ root: true });

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
