class InputParser {
    pos  = 0;
    line = 1;
    col  = 0;

    constructor(input) {
        this.input = input;
    }
    
    next() {
        let ch = this.parsed.charAt(pos++);
        if (ch == "\n") {
            this.line++;
            this.col = 0;
        } else {
            this.col++;
        }
    }

    peek() {
        return this.parsed.charAt(pos);
    }

    isEOF() {
        return this.peek() == '';
    }

    badInput() {
        throw new Error();
    }
}

class TokenParser {
    keywords = [
        'in',
        'not', 'and', 'or', 'to', 'into',
        'any', 'all', 'leaf',
        'new', 'now', 'no',
        'as', 'is', 'has', 'from', 'times',
        'seqnum', 'sysseqnum', 'depth', 'uuid4',
        'root', 'farthest', 'closest', 'parent'
    ];
    current  = null;

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

    readWhile(pred) {
        let str = '';
        while (!this.input.isEOF() && pred(this.input.peek())) {
            str += this.input.next();
        }

        return str;
    }

    readNext() {
        this.readWhile(this.isWhitespace);

        if (this.input.isEOF()) {
            return null;
        }

        let ch = this.input.peek();

        if (ch == '#') {
            readComment();
            return this.readNext();
        }

        if (ch == '@') {
            return this.readKeyword();
        }

        if (ch == )
    }

    readComment() {
        this.readWhile((ch) => {
            return ch != "\n";
        })

        this.input.next();
    }

    readKeyword() {
        keyword = this.readWhile(isIdentifier).toLowerCase();


    }

    isWhitespace(ch) {
        return /\s/.test(ch);
    }

    isIdentifier() {
        return /[-A-Za-z0-9_]/.test(ch);
    }

    isData = () => {

    }

    isStatement = () => {

    }
}

class StatementParser {

}

class VMDL {
    parse(input) {
        parseStatements(input);
    }
}

export const vmdl = new VMDL();