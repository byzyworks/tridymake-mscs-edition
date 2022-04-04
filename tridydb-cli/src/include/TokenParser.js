import { parser as charParser } from './CharParser.js';
import { Token }                from './Token.js';

import { isEmpty }     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Stack }       from '../utility/Stack.js';

class TokenParser {
    constructor() {
        this.parser = charParser;

        this.mode    = new Stack();
        this.current = null;
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
            } else if (ch === '#') {
                this.mode.push('com');
                break;
            } else if (ch === '@') {
                this.mode.push('key');
                break;
            } else {
                str += ch;
            }
        }

        return str;
    }

    readNext() {
        if (this.mode.peek() !== 'yaml') {
            this.readWhilePred(this.isWhitespace);
        }

        if (this.parser.isEOF()) {
            return null;
        }

        const ch = this.parser.peek();

        if (ch === '#') {
            this.mode.push('com');
            this.parser.next();
        }
        if (this.mode.peek() === 'com') {
            this.mode.pop();
            this.readComment();

            return this.readNext();
        }

        if (ch === '@') {
            this.mode.push('key');
            this.parser.next();
        }
        if (this.mode.peek() === 'key') {
            this.mode.pop();
            const keyword = this.readKeyword();

            return keyword;
        }

        const mode = this.mode.peek();
        if (mode === 'json') {
            return this.readJSON();
        } else if (mode === 'yaml') {
            return this.readYAML();
        }

        if (this.isIdentifier(ch) || this.isVariableStart(ch)) {
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
    }

    readJSON() {
        const pos = this.getPos();

        const part = this.readWhileEscaped().replace(/\s+/g, '');

        return new Token('part', part, pos);
    }

    readYAML() {
        const pos = this.getPos();

        const part = this.readWhileEscaped().replace(/\s+$/gm, '');

        return new Token('part', part, pos);
    }

    readKeyword() {
        const pos = this.getPos();
        pos.col--;

        const keyword = this.readWhilePred(this.isIdentifier).toLowerCase();

        if (isEmpty(keyword)) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: No valid identifier after "@".`);
        }

        switch (keyword) {
            case 'json':
                if (this.mode.peek() != 'json') {
                    this.mode.push('json');
                }
                break;
            case 'yaml':
                if (this.mode.peek() != 'yaml') {
                    this.mode.push('yaml');
                }
                break;
            case 'end':
                switch (this.mode.peek()) {
                    case 'json':
                    case 'yaml':
                        this.mode.pop();
                        break;
                }
        }

        return new Token('key', keyword, pos);
    }

    readTagRecursive(pos) {
        let tag = '';

        let enclosure_cnt = 0;

        tag += this.readWhilePred((ch) => {
            return ch === '$';
        });

        if (!isEmpty(tag)) {
            while (!this.parser.isEOF() && (this.parser.peek() === '{')) {
                tag += this.parser.next();
    
                enclosure_cnt++;
            }
        }

        let ch;
        while (true) {
            ch = this.parser.peek();
            if (this.isVariableStart(ch)) {
                tag += this.readTagRecursive();
            } else if (this.isIdentifier(ch)) {
                tag += this.readWhilePred(this.isIdentifier);
            } else {
                break;
            }
        }

        while ((enclosure_cnt > 0) && !this.parser.isEOF() && (this.parser.peek() === '}')) {
            tag += this.parser.next();

            enclosure_cnt--;
        }

        if (enclosure_cnt !== 0) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: Missing closing bracket in variable "${tag}".`);
        }

        return tag;
    }

    readTag() {
        const pos = this.getPos();

        let tag = '';
        do {
            tag += this.readTagRecursive(pos);
        } while (this.isTag(this.parser.peek()));

        return new Token('tag', tag, pos);
    }

    readPunc() {
        return new Token('punc', this.parser.next(), this.getPos());
    }

    readMultiPunc() {
        const pos = this.getPos();

        const curr = this.parser.peek();

        let punc = this.readWhilePred((ch) => {
            return ch === curr;
        });

        if (curr === '!') {
            punc = punc.replace(/!!/g, '');
            if (punc === '') {
                return this.readNext();
            }
        }
        
        return new Token('punc', punc, pos);
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
        return /[~%^&*()+=\[\]{}|:;,./?]/g.test(ch);
    }

    isMultiPunc(ch) {
        return /[!<>]/g.test(ch);
    }

    isVariableStart(ch) {
        return /[$]/g.test(ch);
    }

    isTag(ch) {
        return this.isIdentifier(ch) || this.isVariableStart(ch);
    }

    getPos() {
        return { line: this.parser.getLine(), col: this.parser.getCol() };
    }
}

export const parser = new TokenParser();
