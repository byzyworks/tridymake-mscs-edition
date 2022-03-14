import { parser as tokenParser } from './TokenParser.js';
import { parser as infixParser } from './InfixParser.js';

class InputParser {
    root       = { };
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

    carryIsEmpty() {
        return this.carry.length == 0;
    }

    parse() {
        let tokens = [ ];

        let badInput = (msg) => {
            throw new Error(msg);
        }

        let parseTokens = () => {
            let pool = [ ];

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

        let parseTree = () => {
            let context = [ ];
            
            let hasContextValue = (last) => {
                let ptr = this.root;
                for (let i = 0; i < context.length - 1; i++) {
                    if (!ptr[context[i]]) {
                        return false;
                    }
                    ptr = ptr[context[i]];
                }
                if (ptr[last]) {
                    return true;
                }
                return false;
            }
        
            let putContextValue = (obj, opts = { replace: true, once: false }) => {
                let ptr = this.root;
                
                for (let i = 0; i < context.length - 1; i++) {
                    if (!ptr[context[i]]) {
                        if (Number.isInteger(context[i])) {
                            if (Number.isInteger(context[i + 1])) {
                                ptr.push([ ]);
                                console.assert(ptr[context[i]]);
                            } else {
                                let obj = { };
                                obj[context[i + 1]] = { };
                                ptr.push(obj);
                                console.assert(ptr[context[i]]);
                            }
                        } else {
                            if (Number.isInteger(context[i + 1])) {
                                ptr[context[i]] = [ ];
                            } else {
                                let obj = { };
                                obj[context[i + 1]] = { };
                                ptr[context[i]] = { };
                            }
                        }
                    }
                    
                    ptr = ptr[context[i]];
                }
    
                let idx = context[context.length - 1];
                if (opts.once && ptr[idx]) {
                    badInput();
                } else if (opts.replace) {
                    ptr[idx] = obj;
                } else {
                    if (!ptr[idx]) {
                        ptr[idx] = [ ];
                    } else if (!Array.isArray(ptr[idx])) {
                        temp = ptr[idx];
                        ptr[idx] = [ ];
                        ptr[idx].push(temp);
                    }
                    ptr[idx].push(obj);
                }
            }

            let getContextValue = () => {
                let ptr = this.root;
                for (let i = 0; i < context.length; i++) {
                    if (!ptr[context[i]]) {
                        return null;
                    }
                    ptr = ptr[context[i]];
                }
                return ptr;
            }
        
            let assertContext = (assert) => {
                let failed = false;
                
                let off = context.length - assert.length;

                for (let i = 0; i < assert.length; i++) {
                    if (context[off + i] != assert[i]) {
                        failed = true;
                        break;
                    }
                }

                if (failed) {
                    failed = [ ];
                    for (let i = off; i < context.length; i++) {
                        failed.push(context[i]);
                    }
                }

                if (failed) {
                    let msg = '';
                    msg += 'Unmatching context. Expected ';
                    msg += JSON.stringify(assert);
                    msg += ', but got ';
                    msg += JSON.stringify(failed);
                    msg += ' instead.'
                    throw new Error(msg);
                }
            }

            let enterContext = (mode, opts = { once: false, assert: null }) => {
                if (opts.once && hasContextValue(mode)) {
                    badInput(getContext());
                }

                context.push(mode);

                if (opts.assert) {
                    assertContext(opts.assert);
                }
            }
        
            let leaveContext = () => {
                return context.pop();
            }
        
            let getContext = () => {
                return context[context.length - 1];
            }

            let nextStatement = () => {
                while (context.pop() != 'stmt');
                if (hasContextValue(context[context.length - 1])) {
                    context[context.length - 1]++;
                }
                context.push('stmt');
            }
    
            let enterStack = () => {
                if (getContext() == 'stack') {
                    assertContext(['stmt', 'definition', 'stack']);
                } else if (context.length != 0) {
                    assertContext(['stmt', 'definition']);
                    context.push('stack');
                } else {
                    context.push('stack');
                }

                let done = getContextValue() ?? [ ];
                context.push(done.length);

                context.push('stmt');
            }
        
            let leaveStack = () => {
                while (context.pop() != 'stack');
            }

            let leaveContextAndRetry = (token) => {
                leaveContext();
                parseTreeMain(token);
            }

            let parseTreeInit = (token) => {
                assertContext(['stmt', 'init']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'vmdl':
                                leaveContext();
                                break;
                            case 'exit':
                                process.exit(0);
                            default:
                                leaveContextAndRetry(token);
                                break;
                        }
                        break;
                    default:
                        leaveContextAndRetry(token);
                        break;
                }
            }

            let parseTreeRoot = (token) => {
                assertContext(['stmt']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'in':
                                enterContext('context', { once: true });
                                break;
                            case 'new':
                                enterContext('operation', { once: true });
                                putContextValue('create');
                                leaveContext();
                                enterContext('definition', { once: true });
                                break;
                            case 'now':
                                enterContext('operation', { once: true });
                                putContextValue('update');
                                leaveContext();
                                enterContext('definition', { once: true });
                                break;
                            case 'no':
                                enterContext('operation', { once: true });
                                putContextValue('delete');
                                leaveContext();
                                break;
                            default:
                                badInput(getContext());
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                nextStatement();
                                break;
                            case '}':
                                leaveStack();
                                break;
                            default:
                                badInput(getContext());
                        }
                        break;
                    default:
                        badInput(getContext());
                }
            }

            let parseTreeContext = (token) => {
                let autoPutAnd = () => {
                    let context_tokens = getContextValue();
                    if (context_tokens) {
                        let last_token = context_tokens[context_tokens.length - 1];
                        if (last_token && ((last_token.type == 't') || (last_token.val == ')'))) {
                            putContextValue({ type: 'o', val: '&' }, { replace: false });
                        }
                    }
                }

                let finalizeExpression = () => {
                    this.infix_parser.load(getContextValue());
                    let postfix = this.infix_parser.parse();
                    putContextValue(postfix, { replace: true });
                }

                assertContext(['stmt', 'context']);

                switch (token.type) {
                    case 'tag':
                        autoPutAnd();
                        putContextValue({ type: 't', val: token.val }, { replace: false });
                        break;
                    case 'key':
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                finalizeExpression();
                                leaveContext();
                                enterContext('operation', { once: true });
                                putContextValue('cswitch');
                                leaveContext();
                                nextStatement();
                                break;
                            case '(':
                                autoPutAnd();
                                putContextValue({ type: 'o', val: '(' }, { replace: false });
                                break;
                            case ')':
                                putContextValue({ type: 'o', val: ')' }, { replace: false });
                                break;
                            case 'not':
                            case '!':
                                autoPutAnd();
                                putContextValue({ type: 'o', val: '!' }, { replace: false });
                                break;
                            case 'and':
                            case '&':
                                putContextValue({ type: 'o', val: '&' }, { replace: false });
                                break;
                            case 'or':
                            case '|':
                            case ',':
                                putContextValue({ type: 'o', val: '|' }, { replace: false });
                                break;
                            case 'to':
                            case '.':
                            case '>':
                                putContextValue({ type: 'o', val: '.' }, { replace: false });
                                break;
                            case 'into':
                            case '..':
                            case '>>':
                                putContextValue({ type: 'o', val: '>' }, { replace: false });
                                break;
                            case 'any':
                            case '*':
                                autoPutAnd();
                                putContextValue({ type: 't', val: '*' }, { replace: false });
                                break;
                            case 'all':
                            case '**':
                                autoPutAnd();
                                putContextValue({ type: 't', val: '**' }, { replace: false });
                                break;
                            case 'leaf':
                            case '***':
                                autoPutAnd();
                                putContextValue({ type: 't', val: '***' }, { replace: false });
                                break;
                            default:
                                finalizeExpression();
                                leaveContextAndRetry(token);
                                break;
                        }
                        break;
                    default:
                        finalizeExpression();
                        leaveContextAndRetry(token);
                        break;
                }
            }

            let parseTreeDefinition = (token) => {
                assertContext(['stmt', 'definition']);
                
                switch (token.type) {
                    case 'tag':
                        enterContext('sys', { once: true });
                        putContextValue(token.val);
                        leaveContext();
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'as':
                                enterContext('tags', { once: true });
                                break;
                            case 'is':
                                enterContext('heap', { once: true });
                                break;
                            case 'has':
                                enterContext('stack', { once: true });
                                break;
                            default:
                                leaveContextAndRetry(token);
                                break;
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                leaveContext();
                                nextStatement();
                                break;
                            default:
                                leaveContextAndRetry(token);
                                break;
                        }
                        break;
                    default:
                        leaveContextAndRetry(token);
                        break;
                }
            }

            let parseTreeAffect = (token) => {
                assertContext(['stmt', 'affect']);
                
                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'tags':
                                putContextValue('tags', { once: true });
                                leaveContext();
                                break;
                            case 'heap':
                                putContextValue('heap', { once: true });
                                leaveContext();
                                break;
                            case 'stack':
                                putContextValue('stack', { once: true });
                                leaveContext();
                                break;
                            default:
                                badInput();
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                putContextValue('any', { once: true });
                                leaveContext();
                                nextStatement();
                                break;
                            default:
                                badInput();
                        }
                        break;
                    default:
                        badInput();
                }
            }

            let parseTreeTagsDefinition = (token) => {
                assertContext(['stmt', 'definition', 'tags']);

                switch (token.type) {
                    case 'tag':
                        putContextValue(token.val, { replace: false });
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                leaveContext();
                                leaveContext();
                                nextStatement();
                                break;
                            default:
                                let tags = getContextValue();
                                if (tags && tags.length != 0) {
                                    leaveContextAndRetry(token);
                                } else {
                                    badInput(getContext());
                                }
                                break;
                        }
                        break;
                    default:
                        let tags = getContextValue();
                        if (tags && tags.length != 0) {
                            leaveContextAndRetry(token);
                        } else {
                            badInput(getContext());
                        }
                        break;
                }
            }

            let parseTreeHeapDefinition = (token) => {
                assertContext(['stmt', 'definition', 'heap']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'json':
                                enterContext('type', { once: true });
                                putContextValue('json');
                                leaveContext();
                                enterContext('data', { once: true });
                                break;
                            default:
                                badInput(getContext());
                        }
                        break;
                    default:
                        badInput(getContext());
                }
            }

            let parseTreeHeapDataDefinition = (token) => {
                assertContext(['stmt', 'definition', 'heap', 'data']);

                switch (token.type) {
                    case 'part':
                        putContextValue(token, { replace: false });
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'end':
                                leaveContext();
                                leaveContext();
                                break;
                            case 'seqnum':
                            case 'sysseqnum':
                            case 'depth':
                            case 'uuid':
                            case 'root':
                            case 'farthest':
                            case 'closest':
                            case 'parent':
                                putContextValue(token, { replace: false });
                                break;
                            default:
                                badInput(getContext());
                        }
                        break;
                    default:
                        badInput(getContext());
                }
            }

            let parseTreeStackDefinition = (token) => {
                assertContext(['stmt', 'definition', 'stack']);

                switch (token.type) {
                    case 'punc':
                        switch (token.val) {
                            case '{':
                                enterStack();
                                break;
                            default:
                                badInput(getContext());
                        }
                        break;
                    default:
                        badInput(getContext());
                }
            }

            let parseTreeMain = (token) => {
                switch (getContext()) {
                    case 'init':
                        parseTreeInit(token);
                        break;
                    case 'stmt':
                        parseTreeRoot(token);
                        break;
                    case 'context':
                        parseTreeContext(token);
                        break;
                    case 'definition':
                        parseTreeDefinition(token);
                        break;
                    case 'affect':
                        parseTreeAffected(token);
                        break;
                    case 'tags':
                        parseTreeTagsDefinition(token);
                        break;
                    case 'heap':
                        parseTreeHeapDefinition(token);
                        break;
                    case 'data':
                        parseTreeHeapDataDefinition(token);
                        break;
                    case 'stack':
                        parseTreeStackDefinition(token);
                        break;
                }
            }

            enterStack();
            enterContext('init');
            
            let init = true;
            for (let token of tokens) {
                parseTreeMain(token);
            }

            return this.root;
        }

        parseTokens();
        return parseTree();
    }
}

export let parser = new InputParser();
