class CharParser {
    constructor() {
        this.input = '';

        this.pos  = 0;
        this.line = 1;
        this.col  = 0;
    }
    
    load(raw) {
        this.input += raw;
    }

    clear() {
        this.input = '';

        this.pos  = 0;
        this.line = 1;
        this.col  = 0;
    }

    next() {
        const ch = this.input.charAt(this.pos++);
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

    getLine() {
        return this.line;
    }

    getCol() {
        return this.col;
    }
}

export const parser = new CharParser();
