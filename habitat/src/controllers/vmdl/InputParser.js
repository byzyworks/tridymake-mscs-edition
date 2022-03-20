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
    }

    carryIsEmpty() {
        return this.carry.length === 0;
    }

    parse(opts = { }) {
        opts.accept_carry = opts.accept_carry ?? false;

        const tokens = [ ];
        const astree = new StateTree();

        const parseTokensWithCarry = () => {
            const pool = [ ];

            let token;

            for (token of this.carry) {
                pool.push(token);
            }
            
            while (token = this.parser.next()) {
                pool.push(token);
            }

            let idx;

            let stmt_cutoff = null;
            for (idx = this.carry.length; idx < pool.length; idx++) {
                if (pool[idx].val == '{') {
                    this.last_depth++;
                } else if (pool[idx].val == '}') {
                    this.last_depth--;
                }

                if (pool[idx].val == ';') {
                    this.last_ended = true;
                } else {
                    this.last_ended = false;
                }

                if (this.last_ended && this.last_depth == 0) {
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
                
                if (token.val == '{') {
                    this.last_depth++;
                } else if (token.val == '}') {
                    this.last_depth--;
                }

                if (token.val == ';') {
                    this.last_ended = true;
                } else {
                    this.last_ended = false;
                }

                if (this.last_ended && this.last_depth == 0) {
                    carry_needed = false;
                } else {
                    carry_needed = true;
                }
            }
            
            if (carry_needed) {
                throw new SyntaxError(`The input given contains an incomplete VMDL statement (missing final ";" or "}").`);
            }
        }

        const parseTree = () => {
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
                const isToken = (type, value) => {
                    return (((tokens[it].type == type) || (type === null)) && ((tokens[it].val == value) || (value === null)));
                }

                const handleUnexpected = () => {
                    token = currentToken();
                    switch (token.type) {
                        case 'key':
                            throw new SyntaxError(`line ${token.pos.line}, col ${token.pos.col}: Unexpected keyword "${token.val}".`);
                        default:
                            throw new SyntaxError(`line ${token.pos.line}, col ${token.pos.col}: Unexpected token "${token.val}".`);
                    }
                }
                
                const handleContext = () => {
                    const readWhileContextExpressionTerminal = () => {
                        const isTaglikeContextToken = () => {
                            return false ||
                                isToken('tag', null, token) ||
                                isToken('key', 'any', token) ||
                                isToken('punc', '*', token) ||
                                isToken('key', 'all', token) ||
                                isToken('punc', '**', token) ||
                                isToken('key', 'leaf', token) ||
                                isToken('punc', '***', token)
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
                    
                    const readWhileContextExpression = () => {
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
                                isToken('key', 'and', token) ||
                                isToken('punc', '&', token) ||
                                isToken('key', 'or', token) ||
                                isToken('punc', '|', token) ||
                                isToken('punc', ',', token) ||
                                isToken('key', 'of', token) ||
                                isToken('punc', '.', token) ||
                                isToken('key', 'from', token) ||
                                isToken('punc', ':', token) ||
                                isToken('punc', '..', token)
                            ;
                        }
                        
                        const handleBinaryOpContextToken = () => {
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
                                case 'of':
                                case '.':
                                    context.push({ type: 'o', val: '.' });
                                    break;
                                case 'from':
                                case ':':
                                case '..':
                                    context.push({ type: 'o', val: ':' });
                                    break;
                            }
                            nextToken();
                        }
                
                        let context = [ ];
                        
                        let is_enclosed = false;

                        if (isUnaryOpContextToken()) {
                            handleUnaryOpContextToken();
                        }
                    
                        if (isToken('punc', '(')) {
                            context.push({ type: 'o', val: '(' });
                            nextToken();
                    
                            is_enclosed = true;
                        }
                    
                        let a = readWhileContextExpressionTerminal();
                        if (isEmpty(a)) {
                            a = readWhileContextExpression();
                            if (isEmpty(a)) {
                                handleUnexpected();
                            }
                        }
                        context = context.concat(a);

                        if (is_enclosed) {
                            if (isToken('punc', ')')) {
                                context.push({ type: 'o', val: ')' });
                                nextToken();
                            } else {
                                handleUnexpected();
                            }

                            is_enclosed = false;
                        }
                    
                        while (isBinaryOpContextToken()) {
                            handleBinaryOpContextToken();

                            if (isUnaryOpContextToken()) {
                                handleUnaryOpContextToken();
                            }
                        
                            if (isToken('punc', '(')) {
                                context.push({ type: 'o', val: '(' });
                                nextToken();
                        
                                is_enclosed = true;
                            }
                    
                            let b = readWhileContextExpressionTerminal();
                            if (isEmpty(b)) {
                                b = readWhileContextExpression();
                                if (isEmpty(b)) {
                                    handleUnexpected();
                                }
                            }
                            context = context.concat(b);

                            if (is_enclosed) {
                                if (isToken('punc', ')')) {
                                    context.push({ type: 'o', val: ')' });
                                    nextToken();
                                } else {
                                    handleUnexpected();
                                }
    
                                is_enclosed = false;
                            }
                        }
                    
                        if (is_enclosed) {
                            if (isToken('punc', ')')) {
                                context.push({ type: 'o', val: ')' });
                                nextToken();
                            } else {
                                handleUnexpected();
                            }
                        }
                    
                        return context;
                    }

                    const toPostfix = (expression) => {
                        this.infix_parser.load(expression);
                        return this.infix_parser.parse();
                    }

                    const context = toPostfix(readWhileContextExpression());

                    astree.enterPos('context');
                    astree.setPosValue(context);
                    astree.leavePos();
                }
                
                const handleOperation = () => {
                    if (isToken('key', 'new')) {
                        astree.enterPos('operation');
                        astree.setPosValue('create');
                        astree.leavePos();
                        astree.enterPos('definition');
                    } else if (isToken('key', 'now')) {
                        astree.enterPos('operation');
                        astree.setPosValue('update');
                        astree.leavePos();
                        astree.enterPos('definition');
                    } else if (isToken('key', 'no')) {
                        astree.enterPos('operation');
                        astree.setPosValue('delete');
                        astree.leavePos();
                        astree.enterPos('affect');
                    } else {
                        handleUnexpected();
                    }
                    nextToken();
                }
                
                const handleDefinition = () => {
                    const handleSysDefinition = () => {
                        if (isToken('tag', null)) {
                            const token = currentToken();
                    
                            astree.enterPos('sys');
                            astree.setPosValue(token.val);
                            astree.leavePos();
                    
                            astree.enterPos('tags');
                            astree.setPosValue([token.val]);
                            astree.leavePos();
                    
                            nextToken();
                        } else {
                            handleUnexpected();
                        }
                    }
                
                    const handleTagsDefinition = () => {
                        const readWhileTag = () => {
                            const isTagVariable = () => {
                                return false ||
                                    isToken('key', 'uuid')
                                ;
                            }
                            
                            const tags = [ ];
                            while (true) {
                                if (isToken('tag', null) || isTagVariable()) {
                                    let new_tag = currentToken().val;
                                    if (isTagVariable()) {
                                        new_tag = '@' + new_tag;
                                    }

                                    for (const current_tag of tags) {
                                        if (new_tag == current_tag) {
                                            handleUnexpected();
                                        }
                                    }

                                    tags.push(new_tag);
                                    
                                    nextToken();
                                } else {
                                    break;
                                }
                            }

                            for (let i = 0; i < tags.length; i++) {
                                for (let j = i + 1; j < tags.length; j++) {
                                    if (tags[i] == tags[j]) {
                                        handleUnexpected();
                                    }
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
                            const isHeapVariable = () => {
                                return false ||
                                    isToken('key', 'root') ||
                                    isToken('key', 'farthest') ||
                                    isToken('key', 'closest') ||
                                    isToken('key', 'parent') ||
                                    isToken('key', 'seqnum') ||
                                    isToken('key', 'sysseqnum') ||
                                    isToken('key', 'depth') ||
                                    isToken('key', 'uuid')
                                ;
                            }
                            
                            const data = [ ];
                            while (isToken('part', null) || isHeapVariable()) {
                                token = currentToken().val;
                                if (isHeapVariable()) {
                                    token = '@' + token;
                                }

                                data.push(token);

                                nextToken();
                            }
                        
                            return data;
                        }

                        astree.enterPos('heap');
                
                        if (isToken('key', 'json')) {
                            astree.enterPos('type');
                            astree.setPosValue('json');
                            astree.leavePos();
                        } else {
                            handleUnexpected();
                        }
                        nextToken();
                        
                        const data = readWhileHeapData();
                
                        astree.enterPos('data');
                        astree.setPosValue(data);
                        astree.leavePos();
                
                        if (!isToken('key', 'end')) {
                            handleUnexpected();
                        }
                        nextToken();
                
                        astree.leavePos();
                    }
                
                    const handleStackDefinition = () => {
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
                
                const handleAffected = () => {
                    const isAffectedVariable = () => {
                        return false ||
                            isToken('key', 'machine') ||
                            isToken('key', 'tags') ||
                            isToken('key', 'heap') ||
                            isToken('key', 'stack')
                        ;
                    }
                
                    if (isAffectedVariable()) {
                        astree.enterPos('affected');
                        astree.setPosValue(currentToken().val);
                        astree.leavePos();
                    } else {
                        handleUnexpected();
                    }
                    nextToken();
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

                    if (isToken('punc', ';')) {
                        astree.enterPos('operation');
                        astree.setPosValue('cswitch');
                        astree.leavePos();
                        
                        astree.nextItem();
                        nextToken();

                        return;
                    }
                }

                handleOperation();
                switch (astree.getTopPos()) {
                    case 'definition':
                        handleDefinition();
                        break;
                    default:
                        handleAffected();
                        break;
                }

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

            return astree.getRaw();
        }

        if (opts.accept_carry) {
            parseTokensWithCarry();
        } else {
            parseTokensWithoutCarry();
        }
        this.parser.clear();

        return parseTree();
    }
}

export const parser = new InputParser();
