class CharParser {
    pos   = 0;
    line  = 1;
    col   = 0;

    constructor() {
        this.input = '';
    }
    
    load(raw) {
        this.line = 1;
        this.col  = 0;

        this.input += raw;
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
