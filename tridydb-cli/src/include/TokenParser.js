import { CharParser } from './CharParser.js';
import { Token }      from './Token.js';

import { isEmpty, not } from '../utility/common.js';
import { SyntaxError }  from '../utility/error.js';
import { Stack }        from '../utility/Stack.js';

export class TokenParser {
    constructor() {
        this._parser = new CharParser();

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
        const token   = this._current;
        this._current = null;

        return token || this._readNext();
    }

    peek() {
        this._current = this._current ?? this._readNext();

        return this._current;
    }

    _isWhitespace(ch) {
        return /\s/g.test(ch);
    }

    _isKeywordStart(ch) {
        return ch === '@';
    }

    _isIdentifier(ch) {
        return /[-A-Za-z0-9+_.]/g.test(ch);
    }

    _isTag(ch) {
        return this._isIdentifier(ch);
    }

    _isSymbol(ch) {
        return /[~!$%^&*()=\[\]{}|;,<>?/]/g.test(ch);
    }

    _isNumberStart(ch) {
        return ch === ':';
    }

    _isSingleLineStringQuote(ch) {
        return ch === "'";
    }

    _isMultiLineStringQuote(ch) {
        return ch === '"';
    }

    _isDynamicStringQuote(ch) {
        return ch === '`';
    }

    _isEscape(ch) {
        return ch === '\\';
    }

    _isCommentStart(ch) {
        return ch === '#';
    }

    _getPos() {
        return { line: this._parser.getLine(), col: this._parser.getCol() };
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
            ch = this._parser.peek();

            if (is_escaped) {
                this._parser.next();
                str += ch;
                is_escaped = false;
            } else if (this._isEscape(ch)) {
                this._parser.next();
                is_escaped = true;
            } else if (this._isKeywordStart(ch) || this._isCommentStart(ch)) {
                this._mode.push('normal');
                break;
            } else if (this._isSingleLineStringQuote(ch) && (this._mode.peek() === 'line')) {
                this._parser.next();
                this._mode.pop();
                break;
            } else if (this._isMultiLineStringQuote(ch) && (this._mode.peek() === 'multiline')) {
                this._parser.next();
                this._mode.pop();
                break;
            } else if (this._isDynamicStringQuote(ch) && (this._mode.peek() === 'dynamic')) {
                this._parser.next();
                this._mode.pop();
                break;
            } else {
                this._parser.next();
                str += ch;
            }
        }

        return str;
    }

    _readKeyword() {
        const pos = this._getPos();
        pos.col--;

        const keyword = this._readWhilePred(this._isIdentifier.bind(this)).toLowerCase();
        if (isEmpty(keyword)) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: No valid identifier after "@".`);
        }

        switch (keyword) {
            case 'json':
            case 'yaml':
                if (this._mode.peek() !== keyword) {
                    this._mode.push(keyword);
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

    _readTag() {
        const pos = this._getPos();

        const tag = this._readWhilePred(this._isTag.bind(this));

        return new Token('tag', tag, pos);
    }

    _readSymbols() {
        const pos = this._getPos();

        let sym = '';
        let ch  = this._parser.peek();
        let pre;
        switch (ch) {
            case '!':
            case '=':
                sym += this._parser.next();
                ch  =  this._parser.peek();
                if (ch === '=') {
                    sym += this._parser.next();
                }
                break;
            case '<':
            case '>':
                sym += this._parser.next();
                pre =  ch;
                ch  =  this._parser.peek();
                if (ch === '=') {
                    sym += this._parser.next();
                } else if (ch === pre) {
                    sym += this._parser.next();
                }
                break;
            case '/':
                sym += this._parser.next();
                pre =  ch;
                ch  =  this._parser.peek();
                if (ch === pre) {
                    sym += this._parser.next();
                }
                break;
            default:
                sym += this._parser.next();
        }

        return new Token('sym', sym, pos);
    }

    _readNumber() {
        const pos = this._getPos();
        pos.col--;

        const num = this._readWhilePred(this._isIdentifier.bind(this));
        if (isEmpty(num)) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: No valid number after ":".`);
        } else if (isNaN(num)) {
            throw new SyntaxError(`line ${pos.line}, col ${pos.col}: A number was expected, but "${num}" doesn't appear to be one.`);
        }

        return new Token('num', num, pos);
    }

    _readRaw() {
        const pos = this._getPos();

        let type;
        switch (this._mode.peek()) {
            case 'line':
                type = 'lpart';
                break;
            case 'multiline':
                type = 'mlpart';
                break;
            case 'dynamic':
                type = 'dynpart';
                break;
            default:
                type = 'mlpart';
                break;
        }

        return new Token(type, this._readWhileEscaped(), pos);
    }

    _readComment() {
        this._readWhilePred((ch) => {
            return ch != "\n";
        });
        this._parser.next();
    }
    
    _readNext() {
        if (this._parser.isEOF()) {
            return null;
        }

        switch (this._mode.peek()) {
            case 'json':
            case 'yaml':
            case 'line':
            case 'multiline':
            case 'dynamic':
                return this._readRaw();
        }

        this._readWhilePred(this._isWhitespace.bind(this));
        
        if (this._mode.peek() === 'normal') {
            this._mode.pop();
        }

        const ch = this._parser.peek();

        if (this._isKeywordStart(ch)) {
            this._parser.next();
            return this._readKeyword();
        }

        if (this._isIdentifier(ch)) {
            return this._readTag();
        }

        if (this._isSymbol(ch)) {
            return this._readSymbols();
        }

        if (this._isNumberStart(ch)) {
            this._parser.next();
            return this._readNumber();
        }

        if (this._isSingleLineStringQuote(ch)) {
            this._parser.next();
            this._mode.push('line');
            return this._readRaw();
        }

        if (this._isMultiLineStringQuote(ch)) {
            this._parser.next();
            this._mode.push('multiline');
            return this._readRaw();
        }

        if (this._isDynamicStringQuote(ch)) {
            this._parser.next();
            this._mode.push('dynamic');
            return this._readRaw();
        }

        // This function needs to return something always, at least until it reaches the end of the input.
        // The statement parser will stop checking for new tokens once this function returns null or undefined.
        if (this._isCommentStart(ch)) {
            this._parser.next();
            this._readComment();
            return this._readNext();
        }

        this._readWhilePred(this._isWhitespace.bind(this));

        if (this._parser.isEOF()) {
            return null;
        }

        const pos = this._getPos();
        const anomaly = this._readWhilePred(not(this._isWhitespace.bind(this)));
        throw new SyntaxError(`line ${pos.line}, col ${pos.col}: Unknown token type of "${anomaly}".`);
    }
}
