export class Token {
    constructor(type, val, pos) {
        this.type = type;
        this.val  = val;
        this.pos  = pos;
        this.orig = {
            type: type,
            val:  val
        };
    }

    is(type = null, value = null) {
        return (((this.type == type) || (type === null)) && ((this.val == value) || (value === null)));
    }

    isUnaryOpContextToken() {
        return false ||
            this.is('o', '!')
        ;
    }

    isBasicBinaryOpContextToken() {
        return false ||
            this.is('o', '&') ||
            this.is('o', '^') ||
            this.is('o', '|')
        ;
    }

    isTransitoryNestedOpContextToken() {
        return false ||
            this.is('o', '>') ||
            this.is('o', '>>') ||
            this.is('o', '>>>')
        ;
    }

    isNonTransitoryNestedOpContextToken() {
        return false ||
            this.is('o', '<') ||
            this.is('o', '<<')
        ;
    }

    isBinaryOpContextToken() {
        return false ||
            this.isBasicBinaryOpContextToken() ||
            this.isTransitoryNestedOpContextToken() ||
            this.isNonTransitoryNestedOpContextToken()
        ;
    }

    to(type = null, val = null) {
        if (type != null) {
            this.type = type;
        }
        if (val != null) {
            this.val = val;
        }
    }

    toContextToken() {
        if (this.type == 'tag') {
            this.to('t', this.val);
        } else if ((this.type == 'key') || (this.type == 'punc')) {
            switch (this.val) {
                case 'any':
                case '*':
                    this.to('t', '*');
                    break;
                case 'leaf':
                case '%':
                    this.to('t', '%');
                    break;
                case 'random':
                case '?':
                    this.to('t', '?');
                    break;
                case 'not':
                case '!':
                    this.to('o', '!');
                    break;
                case 'and':
                case '&':
                    this.to('o', '&');
                    break;
                case 'xor':
                case '^':
                    this.to('o', '^');
                    break;
                case 'or':
                case '|':
                case ',':
                    this.to('o', '|');
                    break;
                case 'to':
                case '/':
                case '>':
                    this.to('o', '>');
                    break;
                case 'toward':
                case '>>':
                    this.to('o', '>>');
                    break;
                case 'toall':
                case '>>>':
                    this.to('o', '>>>');
                    break;
                case 'parent':
                case '<':
                    this.to('o', '<');
                    break;
                case 'ascend':
                case '<<':
                    this.to('o', '<<');
                    break;
                case '(':
                    this.to('o', '(');
                    break;
                case ')':
                    this.to('o', ')');
                    break;
            }
        }
    }

    isReadOpToken() {
        return false ||
            this.is('key', 'get')
        ;
    }

    isDefiningOpToken() {
        return false ||
            this.is('key', 'set') ||
            this.is('key', 'new')
        ;
    }

    isAffectingOpToken() {
        return false ||
            this.is('key', 'get') ||
            this.is('key', 'del')
        ;
    }

    isRawInputToken() {
        return false ||
            this.is('key', 'json')
        ;
    }
}
