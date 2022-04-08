export class Token {
    constructor(type, val, debug = { }) {
        this.type  = type;
        this.val   = val;
        this.debug = debug;
        if (!debug.type) {
            this.debug.type = this.type;
            this.debug.val  = this.val;
        }
    }

    is(type = null, value = null) {
        return (((this.type == type) || (type === null)) && ((this.val == value) || (value === null)));
    }

    isUnaryOpContextToken() {
        return false ||
            this.is('o', '!')
        ;
    }

    isExpressionStarterContextToken() {
        return false ||
            this.is('t') ||
            this.isUnaryOpContextToken() ||
            this.is('o', '(')
        ;
    }

    isExpressionEnderContextToken() {
        return false ||
            this.is('t') ||
            this.is('o', ')')
        ;
    }

    isBasicBinaryOpContextToken() {
        return false ||
            this.is('o', '&') ||
            this.is('o', '^') ||
            this.is('o', '|')
        ;
    }

    isNonTransitoryNestedOpContextToken() {
        return false ||
            this.is('o', '>') ||
            this.is('o', '>>') ||
            this.is('o', '<') ||
            this.is('o', '<<')
        ;
    }

    isTransitoryNestedOpContextToken() {
        return false ||
            this.is('o', '/') ||
            this.is('o', '//')
        ;
    }

    isBinaryOpContextToken() {
        return false ||
            this.isBasicBinaryOpContextToken() ||
            this.isTransitoryNestedOpContextToken() ||
            this.isNonTransitoryNestedOpContextToken()
        ;
    }

    to(type, val) {
        return new Token(type, val, this.debug);
    }

    toContextToken() {
        if (this.type == 'tag') {
            return this.to('t', this.val);
        } else if ((this.type == 'key') || (this.type == 'punc')) {
            switch (this.val) {
                case 'any':
                case '*':
                    return this.to('t', '*');
                case 'root':
                case '~':
                    return this.to('t', '~');
                case 'leaf':
                case '%':
                    return this.to('t', '%');
                case 'random':
                case '?':
                    return this.to('t', '?');
                case 'not':
                case '!':
                    return this.to('o', '!');
                case 'and':
                case '&':
                    return this.to('o', '&');
                case 'xor':
                case '^':
                    return this.to('o', '^');
                case 'or':
                case '|':
                case ',':
                    return this.to('o', '|');
                case 'parent':
                case '>':
                    return this.to('o', '>');
                case 'ascend':
                case '>>':
                    return this.to('o', '>>');
                case 'child':
                case '<':
                    return this.to('o', '<');
                case 'descend':
                case '<<':
                    return this.to('o', '<<');
                case 'to':
                case '/':
                    return this.to('o', '/');
                case 'toward':
                case '//':
                    return this.to('o', '//');
                case '(':
                    return this.to('o', '(');
                case ')':
                    return this.to('o', ')');
                default:
                    return this.to(this.type, this.val);
            }
        } else {
            return this.to(this.type, this.val);
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
            this.is('key', 'json') ||
            this.is('key', 'yaml')
        ;
    }
}
