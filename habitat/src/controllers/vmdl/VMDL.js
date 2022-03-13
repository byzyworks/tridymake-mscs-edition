class InputParser {
    pos  = 0;
    line = 1;
    col  = 0;

    constructor(input) {
        this.input = input;
    }
    
    next() {
        let ch = this.input.charAt(this.pos++);
        if (ch == "\n") {
            this.line++;
            this.col = 0;
        } else {
            this.col++;
        }

        return ch;
    }

    peek() {
        return this.input.charAt(this.pos);
    }

    isEOF() {
        return this.peek() == '';
    }

    badInput() {
        throw new Error();
    }
}

class TokenParser {
    mode    = [ ];
    current = null;

    constructor(input) {
        this.input = new InputParser(input);
    }

    next() {
        let token    = this.current;
        this.current = null;

        return token || this.readNext();
    }

    peek() {
        this.current = this.current ?? this.readNext();

        return this.current;
    }

    readWhilePred(pred) {
        let str = '';
        while (!this.input.isEOF() && pred(this.input.peek())) {
            str += this.input.next();
        }

        return str;
    }

    readWhileEscaped() {
        let is_escaped = false
        let str        = '';
        let ch;

        while (!this.input.isEOF()) {
            ch = this.input.next();

            if (is_escaped) {
                str += ch;
                is_escaped = false;
            } else if (this.isEscape(ch)) {
                is_escaped = true;
            } else if (ch == '@') {
                this.mode.push('key');
                break;
            } else if (ch == '#') {
                this.mode.push('com');
                break;
            } else {
                str += ch;
            }
        }

        return str;
    }

    readNext() {
        this.readWhilePred(this.isWhitespace);

        if (this.input.isEOF()) {
            return null;
        }

        let ch = this.input.peek();

        if (ch == '#') {
            this.setMode('com');
            this.input.next();
        }
        if (this.getMode() == 'com') {
            this.unsetMode();
            this.readComment();

            return this.readNext();
        }

        if (ch == '@') {
            this.setMode('key');
            this.input.next();
        }
        if (this.getMode() == 'key') {
            this.unsetMode();
            let keyword = this.readKeyword();

            return keyword;
        }

        if (this.getMode() == 'json') {
            return this.readJSON();
        }

        if (this.isIdentifier(ch)) {
            return this.readTag();
        }

        if (this.isPunc(ch)) {
            return this.readPunc();
        }

        if (this.isMultiPunc(ch)) {
            return this.readMultiPunc();
        }

        this.input.badInput();
    }

    readComment() {
        this.readWhilePred((ch) => {
            return ch != "\n";
        })

        this.mode = null;
        this.input.next();
    }

    readJSON() {
        let part = this.readWhileEscaped();

        return { type: "part", val: part };
    }

    readKeyword() {
        let keyword = this.readWhilePred(this.isIdentifier).toLowerCase();

        if (keyword == 'json') {
            if (this.getMode() != 'json') {
                this.setMode('json');
            }
        } else if (keyword == 'end') {
            if (this.getMode() == 'json') {
                this.unsetMode();
            }
        }

        return { type: "key", val: keyword };
    }

    readTag() {
        let tag = this.readWhilePred(this.isIdentifier);

        return { type: "tag", val: tag };
    }

    readPunc() {
        return { type: "punc", val: this.input.next() };
    }

    readMultiPunc() {
        let punc = this.readWhilePred(this.isMultiPunc);

        return { type: "punc", val: punc };
    }
    
    isWhitespace(ch) {
        return /\s/.test(ch);
    }

    isEscape(ch) {
        return /\\/.test(ch);
    }

    isIdentifier(ch) {
        return /[-A-Za-z0-9_]/.test(ch);
    }

    isPunc(ch) {
        return /[!&|,()\[\]{};]/.test(ch);
    }

    isMultiPunc(ch) {
        return /[.>*]/.test(ch);
    }

    setMode(mode) {
        this.mode.push(mode);
    }

    unsetMode() {
        return this.mode.pop();
    }

    getMode() {
        return this.mode[this.mode.length - 1];
    }
}

class StatementParser {
    constructor(input) {
        this.input = new TokenParser(input);
    }

    parse() {
        let tokens = [ ];

        let badInput = (msg) => {
            throw new Error(msg);
        }

        let parseTokens = () => {
            let token;
            while (token = this.input.next()) {
                tokens.push(token);
            }
        }

        let parseTree = () => {
            let context = [ ];
            let root    = { };
            
            let hasContextValue = (last) => {
                let ptr = root;
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
                let ptr = root;
                
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
                let ptr = root;
                for (let i = 0; i < context.length - 1; i++) {
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
                context.push(0);
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
                        if (last_token && ((last_token.type == 'tag') || (last_token.val == ')'))) {
                            putContextValue({ type: 'op', val: '&' }, { replace: false });
                        }
                    }
                }

                assertContext(['stmt', 'context']);

                switch (token.type) {
                    case 'tag':
                        autoPutAnd();
                        putContextValue({ type: 'tag', val: token.val }, { replace: false });
                        break;
                    case 'key':
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                leaveContext();
                                enterContext('operation', { once: true });
                                putContextValue('cswitch');
                                leaveContext();
                                nextStatement();
                                break;
                            case '(':
                                autoPutAnd();
                                putContextValue({ type: 'op', val: '(' }, { replace: false });
                                break;
                            case ')':
                                putContextValue({ type: 'op', val: ')' }, { replace: false });
                                break;
                            case 'not':
                            case '!':
                                autoPutAnd();
                                putContextValue({ type: 'op', val: '!' }, { replace: false });
                                break;
                            case 'and':
                            case '&':
                                putContextValue({ type: 'op', val: '&' }, { replace: false });
                                break;
                            case 'or':
                            case '|':
                            case ',':
                                putContextValue({ type: 'op', val: '|' }, { replace: false });
                                break;
                            case 'to':
                            case '.':
                            case '>':
                                putContextValue({ type: 'op', val: '.' }, { replace: false });
                                break;
                            case 'into':
                            case '..':
                            case '>>':
                                putContextValue({ type: 'op', val: '>' }, { replace: false });
                                break;
                            case 'any':
                            case '*':
                                putContextValue({ type: 'wc', val: 'any' }, { replace: false });
                                break;
                            case 'all':
                            case '**':
                                putContextValue({ type: 'wc', val: 'all' }, { replace: false });
                                break;
                            case 'leaf':
                            case '***':
                                putContextValue({ type: 'wc', val: 'leaf' }, { replace: false });
                                break;
                            case 'new':
                                leaveContext();
                                enterContext('operation', { once: true });
                                putContextValue('create');
                                leaveContext();
                                enterContext('definition', { once: true });
                                break;
                            case 'now':
                                leaveContext();
                                enterContext('operation', { once: true });
                                putContextValue('update');
                                leaveContext();
                                enterContext('definition', { once: true });
                                break;
                            case 'no':
                                leaveContext();
                                enterContext('operation', { once: true });
                                putContextValue('delete');
                                leaveContext();
                                enterContext('affected', { once: true });
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
                            case 'times':
                                enterContext('count', { once: true });
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

            let parseTreeAffected = (token) => {
                assertContext(['stmt', 'affected']);
                
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

            let parseTreeCountDefinition = (token) => {
                assertContext(['stmt', 'definition', 'count']);

                switch (token.type) {
                    case 'tag':
                        if (Number.isInteger(token.val)) {
                            putContextValue(token.val);
                            leaveContext();
                            break;
                        } else {
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
                    case 'affected':
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
                    case 'extend':
                        parseTreeExtendDefinition(token);
                        break;
                    case 'count':
                        parseTreeCountDefinition(token);
                        break;
                }
            }

            enterStack();
            enterContext('init');
            
            let init = true;
            for (let token of tokens) {
                parseTreeMain(token);
            }

            return root;
        }

        parseTokens();
        return parseTree();
    }
}

class VMDL {
    parse(input) {
        let parser = new StatementParser(input);
        let tree   = parser.parse();

        console.log(JSON.stringify(tree));
    }
}

export const vmdl = new VMDL();
