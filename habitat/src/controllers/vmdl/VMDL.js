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
    mode    = [];
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
        return /[&|,.>()\[\]{};]/.test(ch);
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
    constructor() { }

    parse(input) {
        let tokens = [];
        let modes  = [];
        let root   = [];

        let badInput = () => {
            throw new Error();
        }

        let parseTokens = () => {
            let input = new TokenParser(input);
            let token;
    
            while (token = input.next()) {
                tokens.push(token);
            }
        }
    
        let nextStatement = () => {
            while (modes.pop() != 'stmt');
            modes[modes.length - 1]++;
            modes.push('stmt');
        }
    
        let isPlaced = (obj) => {
            ptr = root;
            for (let i = 0; i < modes.length - 1; i++) {
                if (!ptr[modes[i]]) {
                    return false;
                }
                ptr = ptr[modes[i]];
            }
            if (ptr[obj]) {
                return true;
            }
            return false;
        }
    
        let emplace = (obj, opts = { replace: true }) => {
            ptr = root;
            for (let i = 0; i < modes.length - 2; i++) {
                if (!ptr[modes[i]]) {
                    if (Number.isInteger(modes[i])) {
                        ptr.push({ });
                    } else {
                        ptr[modes[i]] = { };
                    }
                }
                ptr = ptr[modes[i]];
            }

            idx = modes[modes.length - 1];
            if (opts.replace) {
                ptr[idx] = obj;
            } else {
                if (!ptr[idx] || !Array.isArray(ptr[idx])) {
                    ptr[idx] = [];
                }
                ptr[idx].push(obj);
            }
        }
    
        let setMode = (mode) => {
            modes.push(mode);
        }

        let setUniqueMode = (mode) => {
            if (isPlaced(mode)) {
                badInput();
            } else {
                setMode(mode);
            }
        }
    
        let unsetMode = () => {
            return modes.pop();
        }
    
        let getMode = () => {
            return modes[modes.length - 1];
        }

        let parseTree = () => {
            let tag_mode = 'primary';

            let parseTreeTop = () => {
                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'in':
                                setUniqueMode('context');
                                break;
                            case 'new':
                                setUniqueMode('operation');
                                emplace('create');
                                unsetMode();
                                setUniqueMode('definition');
                                break;
                            case 'now':
                                setUniqueMode('operation');
                                emplace('update');
                                unsetMode();
                                setUniqueMode('definition');
                                break;
                            case 'no':
                                setUniqueMode('operation');
                                emplace('delete');
                                unsetMode();
                                setUniqueMode('definition');
                                break;
                            default:
                                badInput();
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
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

            let parseTreeContext = () => {
                
            }

            let enterStack = () => {
                modes.push('stack');
                modes.push(0);
                modes.push('stmt');
            }
        
            let leaveStack = () => {
                while (modes.pop() != 'stack');
            }

            let parseTreeDefinition = () => {
                switch (token.type) {
                    case 'tag':
                        setMode('tags');
                        if ((tag_mode == 'primary') || (tag_mode == 'secondary')) {
                            emplace(token.val, { replace: false });
                        }
                        unsetMode();
                        if (tag_mode == 'primary') {
                            setMode('sys');
                            emplace(token.val, { replace: true });
                            unsetMode();
                        }
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'as':
                                tag_mode = 'secondary';
                                setMode('tags');
                                emplace([], { replace: true });
                                unsetMode();
                                break;
                            case 'is':
                                setUniqueMode('heap');
                                break;
                            case 'has':
                                break;
                            case 'from':
                                break;
                            case 'times':
                                break;
                            default:
                                badInput();
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case '{':
                                enterStack();
                                break;
                            case '}':
                                leaveStack();
                                break;
                            default:
                                badInput();
                        }
                        break;
                    default:
                        badInput();
                }
            }

            let parseTreeHeapDefinition = () => {
                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'json':
                                setUniqueMode('type');
                                emplace('json');
                                unsetMode();
                                setUniqueMode('data');
                                break;
                            case 'end':
                                // continue here 
                                break;
                        }
                        break;
                    
                }
            }

            enterStack();

            init = true;
            for (token of this.tokens) {
                if (init) {
                    switch (token.type) {
                        case 'key':
                            switch (token.val) {
                                case 'vmdl':
                                    break;
                                case 'exit':
                                    process.exit(0);
                            }
                    }
                    
                    init = false;
                }
    
                switch (getMode()) {
                    case 'stmt':
                        parseTreeTop(token);
                        break;
                    case 'context':
                        parseTreeContext(token);
                        break;
                    case 'definition':
                        parseTreeDefinition(token);
                        break;
                    case 'heap':
                        parseTreeHeapDefinition(token);
                        break;
                }
            }
        }

        parseTokens();
        parseTree();
    }
}

class VMDL {
    parse(input) {
        this.input = new StatementParser(input);
        this.input.parse();

        console.log(this.input.tokens);
    }
}

export const vmdl = new VMDL();
