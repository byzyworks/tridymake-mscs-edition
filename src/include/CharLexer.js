export class CharLexer {
    constructor(opts = { }) {
        opts.filepath = opts.filepath ?? null;

        this._input = '';

        this._filepath = opts.filepath;
        this._pos      = 0;
        this._line     = 1;
        this._col      = 0;
    }
    
    load(raw) {
        this._input += raw;
    }

    clear() {
        this._input = '';

        this._pos  = 0;
        this._line = 1;
        this._col  = 0;
    }

    next() {
        const ch = this._input.charAt(this._pos++);
        if (ch === "\n") {
            this._line++;
            this._col = 0;
        } else {
            this._col++;
        }

        return ch;
    }

    peek() {
        return this._input.charAt(this._pos);
    }

    isEOF() {
        return this.peek() === '';
    }

    getFilepath() {
        return this._filepath;
    }

    getLine() {
        return this._line;
    }

    getCol() {
        return this._col;
    }

    getPos() {
        return { filepath: this._filepath, line: this._line, col: this._col };
    }
}
