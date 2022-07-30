import { CharLexer } from './CharLexer.js';

import { not }         from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Stack }       from '../utility/Stack.js';
import { Token }       from '../utility/Token.js';

export class TokenLexer {
    constructor() {
        this._lexer   = new CharLexer();
        this._mode    = new Stack();
        this._current = null;
    }

    load(input, opts = { }) {
        opts.filepath = opts.filepath ?? null;

        if (opts.filepath !== null) {
            this._lexer.clear();
            this._lexer = new CharLexer({ filepath: opts.filepath });
        }
        this._lexer.load(input);
    }

    clear() {
        this._lexer.clear();

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
        return /[~!$^&*()=\[\]{}|;:,<>?/]/g.test(ch);
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

    _isDataStringQuote(ch) {
        return ch === '%';
    }

    _isEscape(ch) {
        return ch === '\\';
    }

    _isCommentStart(ch) {
        return ch === '#';
    }

    _readWhilePred(pred) {
        let str = '';
        while (!this._lexer.isEOF() && pred(this._lexer.peek())) {
            str += this._lexer.next();
        }

        return str;
    }

    _readWhileEscaped() {
        let is_escaped = false
        let str        = '';
        let ch;

        while (!this._lexer.isEOF()) {
            ch = this._lexer.peek();

            if (is_escaped) {
                this._lexer.next();
                str += ch;
                is_escaped = false;
            } else if (this._isEscape(ch)) {
                this._lexer.next();
                is_escaped = true;
            } else if (this._isCommentStart(ch)) {
                this._mode.push('normal');
                break;
            } else if (this._isSingleLineStringQuote(ch) && (this._mode.peek() === 'line')) {
                this._lexer.next();
                this._mode.pop();
                break;
            } else if (this._isMultiLineStringQuote(ch) && (this._mode.peek() === 'multiline')) {
                this._lexer.next();
                this._mode.pop();
                break;
            } else if (this._isDynamicStringQuote(ch) && (this._mode.peek() === 'dynamic')) {
                this._lexer.next();
                this._mode.pop();
                break;
            } else if (this._isDataStringQuote(ch) && (this._mode.peek() === 'data')) {
                this._lexer.next();
                this._mode.pop();
                break;
            } else {
                this._lexer.next();
                str += ch;
            }
        }

        return str;
    }

    _readKeyword() {
        const pos = this._lexer.getPos();
        pos.col--;

        const keyword = this._readWhilePred(this._isIdentifier.bind(this)).toLowerCase();

        return new Token('key', keyword, pos);
    }

    _readTag() {
        const pos = this._lexer.getPos();

        const tag = this._readWhilePred(this._isTag.bind(this));

        return new Token('tag', tag, pos);
    }

    _readSymbols() {
        const pos = this._lexer.getPos();

        let sym = '';
        let ch  = this._lexer.peek();
        let pre;
        switch (ch) {
            case '*':
                sym += this._lexer.next();
                pre =  ch;
                ch  =  this._lexer.peek();
                if (ch === pre) {
                    sym += this._lexer.next();
                }
                break;
            case '!':
                sym += this._lexer.next();
                ch  =  this._lexer.peek();
                if (ch === '=') {
                    sym += this._lexer.next();
                } else if ((ch === '<') || (ch === '>')) {
                    sym += this._lexer.next();
                    pre =  ch;
                    ch  =  this._lexer.peek();
                    if (ch === pre) {
                        sym += this._lexer.next();
                    }
                }
                break;
            case '=':
                sym += this._lexer.next();
                ch  =  this._lexer.peek();
                if (ch === '=') {
                    sym += this._lexer.next();
                }
                break;
            case '&':
                sym += this._lexer.next();
                pre =  ch;
                ch  =  this._lexer.peek();
                if (ch === '/') {
                    sym += this._lexer.next();
                    pre =  ch;
                    ch  =  this._lexer.peek();
                    if (ch === pre) {
                        sym += this._lexer.next();
                    }
                }
                break;
            case '<':
            case '>':
                sym += this._lexer.next();
                pre =  ch;
                ch  =  this._lexer.peek();
                if (ch === '=') {
                    sym += this._lexer.next();
                } else if (ch === pre) {
                    sym += this._lexer.next();
                }
                break;
            case '/':
                sym += this._lexer.next();
                pre =  ch;
                ch  =  this._lexer.peek();
                if (ch === pre) {
                    sym += this._lexer.next();
                }
                break;
            default:
                sym += this._lexer.next();
        }

        return new Token('sym', sym, pos);
    }

    _readRaw() {
        const pos = this._lexer.getPos();

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
            case 'data':
                type = 'datapart';
                break;
        }

        return new Token(type, this._readWhileEscaped(), pos);
    }

    _readComment() {
        this._readWhilePred((ch) => {
            return ch !== "\n";
        });
        if (this._lexer.peek() === "\n") {
            // The condition is because console mode in particular strips out line feeds prematurely.
            this._lexer.next();
        }
    }
    
    _readNext() {
        if (this._lexer.isEOF()) {
            return null;
        }

        switch (this._mode.peek()) {
            case 'line':
            case 'multiline':
            case 'dynamic':
            case 'data':
                return this._readRaw();
        }

        this._readWhilePred(this._isWhitespace.bind(this));
        
        if (this._mode.peek() === 'normal') {
            this._mode.pop();
        }

        const ch = this._lexer.peek();

        if (this._isKeywordStart(ch)) {
            this._lexer.next();
            return this._readKeyword();
        }

        if (this._isIdentifier(ch)) {
            return this._readTag();
        }

        if (this._isSymbol(ch)) {
            return this._readSymbols();
        }

        if (this._isSingleLineStringQuote(ch)) {
            this._lexer.next();
            this._mode.push('line');
            return this._readRaw();
        }

        if (this._isMultiLineStringQuote(ch)) {
            this._lexer.next();
            this._mode.push('multiline');
            return this._readRaw();
        }

        if (this._isDynamicStringQuote(ch)) {
            this._lexer.next();
            this._mode.push('dynamic');
            return this._readRaw();
        }

        if (this._isDataStringQuote(ch)) {
            this._lexer.next();
            this._mode.push('data');
            return this._readRaw();
        }

        // This function needs to return something always, at least until it reaches the end of the input.
        // The statement parser will stop checking for new tokens once this function returns null or undefined.
        if (this._isCommentStart(ch)) {
            this._lexer.next();
            this._readComment();
            return this._readNext();
        }

        this._readWhilePred(this._isWhitespace.bind(this));

        if (this._lexer.isEOF()) {
            return null;
        }

        const pos     = this._lexer.getPos();
        const anomaly = this._readWhilePred(not(this._isWhitespace.bind(this)));
        throw new SyntaxError(Token.getPosString(pos) + `: Unexpected token "${anomaly}".`);
    }
}
