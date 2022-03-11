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
        let json_part = this.readWhileEscaped();

        return { type: "json_part", val: json_part };
    }

    readKeyword() {
        let keyword = this.readWhilePred(this.isIdentifier).toLowerCase();

        if (keyword == 'json') {
            if (this.getMode() != 'json') {
                this.setMode('json');
            }
        } else if (keyword == 'endjson') {
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
        this.mode.pop();
    }

    getMode() {
        return this.mode[this.mode.length - 1];
    }
}

class StatementParser {
    tokens = [];

    constructor(input) {
        this.input = new TokenParser(input);
    }

    parse() {
        let token;

        while (token = this.input.peek()) {
            this.tokens.push(token);
            this.input.next();
        }
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
