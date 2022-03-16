import { parser as charParser } from './CharParser.js';
import { SyntaxError }          from '../../utility/error.js';

class TokenParser {
    mode    = [ ];
    current = null;

    constructor() {
        this.parser = charParser;
    }

    load(input) {
        this.parser.load(input);
    }

    next() {
        const token  = this.current;
        this.current = null;

        return token || this.readNext();
    }

    peek() {
        this.current = this.current ?? this.readNext();

        return this.current;
    }

    readWhilePred(pred) {
        let str = '';
        while (!this.parser.isEOF() && pred(this.parser.peek())) {
            str += this.parser.next();
        }

        return str;
    }

    readWhileEscaped() {
        let is_escaped = false
        let str        = '';
        let ch;

        while (!this.parser.isEOF()) {
            ch = this.parser.next();

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

        if (this.parser.isEOF()) {
            return null;
        }

        const ch = this.parser.peek();

        if (ch == '#') {
            this.setMode('com');
            this.parser.next();
        }
        if (this.getMode() == 'com') {
            this.unsetMode();
            this.readComment();

            return this.readNext();
        }

        if (ch == '@') {
            this.setMode('key');
            this.parser.next();
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

        const anomaly = this.readWhile(this.isNonWhitespace);
        this.throwSyntaxError(`Unrecognized symbol "${anomaly}".`);
    }

    readComment() {
        this.readWhilePred((ch) => {
            return ch != "\n";
        })

        this.mode = null;
        this.parser.next();
    }

    readJSON() {
        const part = this.readWhileEscaped();

        return { type: "part", val: part };
    }

    readKeyword() {
        const keyword = this.readWhilePred(this.isIdentifier).toLowerCase();

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
        const tag = this.readWhilePred(this.isIdentifier);

        return { type: "tag", val: tag };
    }

    readPunc() {
        return { type: "punc", val: this.parser.next() };
    }

    readMultiPunc() {
        const punc = this.readWhilePred(this.isMultiPunc);

        return { type: "punc", val: punc };
    }
    
    isWhitespace(ch) {
        return /\s/.test(ch);
    }

    isNonWhitespace(ch) {
        return !/\s/.test(ch);
    }

    isEscape(ch) {
        return /\\/.test(ch);
    }

    isIdentifier(ch) {
        return /[-A-Za-z0-9_]/.test(ch);
    }

    isPunc(ch) {
        return /[!&|,:()\[\]{};]/.test(ch);
    }

    isMultiPunc(ch) {
        return /[.*]/.test(ch);
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

    throwSyntaxError(msg) {
        const line = this.parser.getLine();
        const col  = this.parser.getCol();
        throw new SyntaxError(`line ${line}, col ${col}: ${msg}`);
    }
}

export const parser = new TokenParser();
