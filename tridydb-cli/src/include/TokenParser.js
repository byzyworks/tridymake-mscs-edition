import { parser as charParser } from './CharParser.js';

import { isEmpty }     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Stack }       from '../utility/Stack.js';

class TokenParser {
    mode    = new Stack();
    current = null;

    constructor() {
        this.parser = charParser;
    }

    load(input) {
        this.parser.load(input);
    }

    clear() {
        this.parser.clear();

        this.mode    = new Stack();
        this.current = null;
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
            } else if (ch == '#') {
                this.mode.push('com');
                break;
            } else if (ch == '@') {
                this.mode.push('key');
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
            this.mode.push('com');
            this.parser.next();
        }
        if (this.mode.peek() == 'com') {
            this.mode.pop();
            this.readComment();

            return this.readNext();
        }

        if (ch == '@') {
            this.mode.push('key');
            this.parser.next();
        }
        if (this.mode.peek() == 'key') {
            this.mode.pop();
            const keyword = this.readKeyword();

            return keyword;
        }

        if (ch == '$') {
            this.mode.push('var');
            this.parser.next();
        }
        if (this.mode.peek() == 'var') {
            this.mode.pop();
            const keyword = this.readVariable();

            return keyword;
        }

        if (this.mode.peek() == 'json') {
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

        const pos = this.getPos();
        const anomaly = this.readWhilePred(this.isNonWhitespace);
        throw new SyntaxError(`line ${pos.line}, col ${pos.col}: Unknown token type of "${anomaly}".`);
    }

    readComment() {
        this.readWhilePred((ch) => {
            return ch != "\n";
        })

        this.mode = new Stack();
        this.parser.next();
    }

    readJSON() {
        const pos = this.getPos();

        const part = this.readWhileEscaped().replace(/\s+/g, '');

        return { type: 'part', val: part, pos: pos };
    }

    readKeyword() {
        const pos = this.getPos();
        pos.col--;

        const keyword = this.readWhilePred(this.isIdentifier).toLowerCase();

        if (isEmpty(keyword)) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: No valid identifier after "@".`);
        }

        if (keyword == 'json') {
            if (this.mode.peek() != 'json') {
                this.mode.push('json');
            }
        } else if (keyword == 'end') {
            if (this.mode.peek() == 'json') {
                this.mode.pop();
            }
        }

        return { type: 'key', val: keyword, pos: pos };
    }

    readVariable() {
        const pos = this.getPos();
        pos.col--;

        const variable = this.readWhilePred(this.isIdentifier);

        if (isEmpty(variable)) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: No valid identifier after "$".`);
        }

        return { type: 'var', val: variable, pos: pos };
    }

    readTag() {
        const pos = this.getPos();

        const tag = this.readWhilePred(this.isIdentifier);

        return { type: 'tag', val: tag, pos: pos };
    }

    readPunc() {
        return { type: 'punc', val: this.parser.next(), pos: this.getPos() };
    }

    readMultiPunc() {
        const pos = this.getPos();

        const curr = this.parser.peek();
        const punc = this.readWhilePred((ch) => {
            return ch == curr;
        });

        return { type: 'punc', val: punc, pos: pos };
    }
    
    isWhitespace(ch) {
        return /\s/g.test(ch);
    }

    isNonWhitespace(ch) {
        return !/\s/g.test(ch);
    }

    isEscape(ch) {
        return /\\/g.test(ch);
    }

    isIdentifier(ch) {
        return /[-A-Za-z0-9_]/g.test(ch);
    }

    isPunc(ch) {
        return /[~!%^&*()+=\[\]{}|:;,./?]/g.test(ch);
    }

    isMultiPunc(ch) {
        return /[<>]/g.test(ch);
    }

    getPos() {
        return { line: this.parser.getLine(), col: this.parser.getCol() };
    }
}

export const parser = new TokenParser();
