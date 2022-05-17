import { parser as charParser } from './CharParser.js';
import { Token }                from './Token.js';

import { isEmpty }     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Stack }       from '../utility/Stack.js';

class TokenParser {
    constructor() {
        this._parser = charParser;

        this._mode    = new Stack();
        this._current = null;
    }

    load(input) {
        this._parser.load(input);
    }

    clear() {
        this._parser.clear();

        this._mode    = new Stack();
        this._current = null;
    }

    next() {
        const token  = this._current;
        this._current = null;

        return token || this._readNext();
    }

    peek() {
        this._current = this._current ?? this._readNext();

        return this._current;
    }

    _readWhilePred(pred) {
        let str = '';
        while (!this._parser.isEOF() && pred(this._parser.peek())) {
            str += this._parser.next();
        }

        return str;
    }

    _readWhileEscaped() {
        let is_escaped = false
        let str        = '';
        let ch;

        while (!this._parser.isEOF()) {
            ch = this._parser.next();

            if (is_escaped) {
                str += ch;
                is_escaped = false;
            } else if (this._isEscape(ch)) {
                is_escaped = true;
            } else if (ch === '#') {
                this._mode.push('com');
                break;
            } else if (ch === '@') {
                this._mode.push('key');
                break;
            } else if ((ch === "'") && (this._mode.peek() === 'sqstring')) {
                this._mode.pop();
                break;
            } else if ((ch === '"') && (this._mode.peek() === 'dqstring')) {
                this._mode.pop();
                break;
            } else if ((ch === '`') && (this._mode.peek() === 'btstring')) {
                this._mode.pop();
                break;
            } else {
                str += ch;
            }
        }

        return str;
    }

    _readNext() {
        switch (this._mode.peek()) {
            case 'yaml':
            case 'sqstring':
            case 'dqstring':
            case 'btstring':
                break;
            default:
                this._readWhilePred(this._isWhitespace);
        }

        if (this._parser.isEOF()) {
            return null;
        }

        const ch = this._parser.peek();

        if (ch === '#') {
            this._mode.push('com');
            this._parser.next();
        }
        if (this._mode.peek() === 'com') {
            this._mode.pop();
            this._readComment();

            return this._readNext();
        }

        if (ch === '@') {
            this._mode.push('key');
            this._parser.next();
        }
        if (this._mode.peek() === 'key') {
            this._mode.pop();
            const keyword = this._readKeyword();

            return keyword;
        }

        if (this._isQuoteMark(ch)) {
            this._readLiteral();
        }

        switch (this._mode.peek()) {
            case 'json':
            case 'yaml':
            case 'sqstring':
            case 'dqstring':
            case 'btstring':
                return this._readRaw();
        }

        if (this._isIdentifier(ch) || this._isVariableStart(ch)) {
            return this._readTag();
        }

        if (this._isPunc(ch)) {
            return this._readPunc();
        }

        if (this._isMultiPunc(ch)) {
            return this._readMultiPunc();
        }

        const pos = this._getPos();
        const anomaly = this._readWhilePred(this._isNonWhitespace);
        throw new SyntaxError(`line ${pos.line}, col ${pos.col}: Unknown token type of "${anomaly}".`);
    }

    _readComment() {
        this._readWhilePred((ch) => {
            return ch != "\n";
        });
        this._parser.next();
    }

    _readRaw() {
        let type;
        switch (this._mode.peek()) {
            case 'sqstring':
                type = 'lpart';
                break;
            case 'dqstring':
                type = 'mlpart';
                break;
            case 'btstring':
                type = 'dynpart';
                break;
            default:
                type = 'mlpart';
                break;
        }

        return new Token(type, this._readWhileEscaped(), this._getPos());
    }

    _readKeyword() {
        const pos = this._getPos();
        pos.col--;

        const keyword = this._readWhilePred(this._isIdentifier).toLowerCase();

        if (isEmpty(keyword)) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: No valid identifier after "@".`);
        }

        switch (keyword) {
            case 'json':
                if (this._mode.peek() !== 'json') {
                    this._mode.push('json');
                }
                break;
            case 'yaml':
                if (this._mode.peek() !== 'yaml') {
                    this._mode.push('yaml');
                }
                break;
            case 'end':
                switch (this._mode.peek()) {
                    case 'json':
                    case 'yaml':
                        this._mode.pop();
                        break;
                }
        }

        return new Token('key', keyword, pos);
    }

    _readTagRecursive(pos) {
        let tag = '';

        let is_enclosed = false;

        tag += this._readWhilePred((ch) => {
            return ch === '$';
        });

        if (!isEmpty(tag)) {
            if (!this._parser.isEOF() && (this._parser.peek() === '{')) {
                tag += this._parser.next();
    
                is_enclosed = true;
            }
        }

        let ch;
        while (true) {
            ch = this._parser.peek();
            if (this._isVariableStart(ch)) {
                tag += this._readTagRecursive();
            } else if (this._isIdentifier(ch)) {
                tag += this._readWhilePred(this._isIdentifier);
            } else {
                break;
            }
        }

        if (is_enclosed) {
            if (this._parser.isEOF() || (this._parser.peek() !== '}')) {
                throw new SyntaxError(`line ${pos.line}, col ${pos.col}: Missing closing bracket in variable "${tag}".`);
            }
            tag += this._parser.next();
        }

        return tag;
    }

    _readTag() {
        const pos = this._getPos();

        let tag = '';
        do {
            tag += this._readTagRecursive(pos);
        } while (this._isTag(this._parser.peek()));

        return new Token('tag', tag, pos);
    }

    _readPunc() {
        return new Token('punc', this._parser.next(), this._getPos());
    }

    _readMultiPunc() {
        const curr = this._parser.peek();

        let punc = this._readWhilePred((ch) => {
            return ch === curr;
        });

        if (curr === '!') {
            punc = punc.replace(/!!/g, '');
            if (punc === '') {
                return this._readNext();
            }
        }
        
        return new Token('punc', punc, this._getPos());
    }

    _readLiteral() {
        switch (this._mode.peek()) {
            case 'json':
            case 'yaml':
                break;
            default:
                const ch = this._parser.next();
                if (ch === "'") {
                    this._mode.push('sqstring');
                } else if (ch === '"') {
                    this._mode.push('dqstring');
                } else if (ch === '`') {
                    this._mode.push('btstring');
                }
        }
    }
    
    _isWhitespace(ch) {
        return /\s/g.test(ch);
    }

    _isNonWhitespace(ch) {
        return !/\s/g.test(ch);
    }

    _isEscape(ch) {
        return /\\/g.test(ch);
    }

    _isIdentifier(ch) {
        return /[-A-Za-z0-9_.]/g.test(ch);
    }

    // Not all of these punctuation symbols are used, but they are included in case one day they are (avoids having to change this bit of code in the future).
    _isPunc(ch) {
        return /[~%^&*()+=\[\]{}|:;,?]/g.test(ch);
    }

    _isMultiPunc(ch) {
        return /[!></]/g.test(ch);
    }

    _isVariableStart(ch) {
        return /[$]/g.test(ch);
    }

    _isQuoteMark(ch) {
        return /['"`]/g.test(ch);
    }

    _isTag(ch) {
        return this._isIdentifier(ch) || this._isVariableStart(ch);
    }

    _getPos() {
        return { line: this._parser.getLine(), col: this._parser.getCol() };
    }
}

export const parser = new TokenParser();
