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

    getTokenType() {
        return this.type;
    }

    getTokenValue() {
        return this.val;
    }

    is(type = null, value = null) {
        return (((this.type == type) || (type === null)) && ((this.val == value) || (value === null)));
    }

    isIdentifierOnlyTerminalContextToken() {
        return false ||
            this.is('ctxt_term', '*')
        ;
    }

    isValueOnlyTerminalContextToken() {
        return false ||
            this.is('ctxt_term', '$D') ||
            this.is('ctxt_term', '$L') ||
            this.is('ctxt_term', '$I') ||
            this.is('ctxt_term', '$N') ||
            this.is('ctxt_term', '$Q') ||
            this.is('ctxt_term', '$S') ||
            this.is('ctxt_term', '$R')
        ;
    }

    isIdentifierTerminalContextToken() {
        return this.is('ctxt_term') && !this.isValueOnlyTerminalContextToken();
    }

    isValuedTerminalContextToken() {
        return this.is('ctxt_term') && !this.isIdentifierOnlyTerminalContextToken();
    }

    isUnaryOpContextToken() {
        return false ||
            this.is('ctxt_op', '!')
        ;
    }

    isExpressionStarterContextToken() {
        return false ||
            this.isIdentifierTerminalContextToken() ||
            this.isUnaryOpContextToken() ||
            this.is('ctxt_misc', '(') ||
            this.is('ctxt_misc', '$')
        ;
    }

    isExpressionEnderContextToken() {
        return false ||
            this.isIdentifierTerminalContextToken() ||
            this.is('ctxt_misc', ')')
        ;
    }

    isBasicBinaryOpContextToken() {
        return false ||
            this.is('ctxt_op', '&') ||
            this.is('ctxt_op', '^') ||
            this.is('ctxt_op', '|')
        ;
    }

    isLookaheadNestedOpContextToken() {
        return false ||
            this.is('ctxt_op', '>') ||
            this.is('ctxt_op', '>>')
        ;
    }

    isLookbehindNestedOpContextToken() {
        return false ||
            this.is('ctxt_op', '<') ||
            this.is('ctxt_op', '<<')
        ;
    }

    isNonTransitiveNestedOpContextToken() {
        return false ||
            this.isLookaheadNestedOpContextToken() ||
            this.isLookbehindNestedOpContextToken()
        ;
    }

    isTransitiveNestedOpContextToken() {
        return false ||
            this.is('ctxt_op', '/') ||
            this.is('ctxt_op', '//')
        ;
    }

    isNestedOpContextToken() {
        return false ||
            this.isNonTransitiveNestedOpContextToken() ||
            this.isTransitiveNestedOpContextToken()
        ;
    }

    isBinaryTagOpContextToken() {
        return false ||
            this.isBasicBinaryOpContextToken() ||
            this.isNonTransitiveNestedOpContextToken() ||
            this.isTransitiveNestedOpContextToken()
        ;
    }

    isBinaryNumberOpContextToken() {
        return false ||
            this.is('ctxt_op', '$==') ||
            this.is('ctxt_op', '$!=') ||
            this.is('ctxt_op', '$<') ||
            this.is('ctxt_op', '$<=') ||
            this.is('ctxt_op', '$>') ||
            this.is('ctxt_op', '$>=')
        ;
    }

    isBinaryOpContextToken() {
        return false ||
            this.isBinaryTagOpContextToken() ||
            this.isBinaryNumberOpContextToken()
        ;
    }

    isTernaryFirstOpContextToken() {
        return this.is('ctxt_op', '?');
    }

    isTernarySecondOpContextToken() {
        return this.is('ctxt_op', ':');
    }

    to(type, val) {
        return new Token(type, val, this.debug);
    }

    toContextToken() {
        switch (this.type) {
            case 'tag':
                return this.to('ctxt_term', this.val);
            case 'key':
            case 'sym':
                switch (this.val) {
                    case '(':
                        return this.to('ctxt_misc', '(');
                    case ')':
                        return this.to('ctxt_misc', ')');
                    case 'any':
                    case '*':
                        return this.to('ctxt_term', '*');
                    case 'not':
                    case '!':
                        return this.to('ctxt_op', '!');
                    case 'and':
                    case '&':
                        return this.to('ctxt_op', '&');
                    case 'xor':
                    case '^':
                        return this.to('ctxt_op', '^');
                    case 'or':
                    case '|':
                    case ',':
                        return this.to('ctxt_op', '|');
                    case 'parent':
                    case '>':
                        return this.to('ctxt_op', '>');
                    case 'ascend':
                    case '>>':
                        return this.to('ctxt_op', '>>');
                    case 'child':
                    case '<':
                        return this.to('ctxt_op', '<');
                    case 'descend':
                    case '<<':
                        return this.to('ctxt_op', '<<');
                    case 'to':
                    case '/':
                        return this.to('ctxt_op', '/');
                    case 'toward':
                    case '//':
                        return this.to('ctxt_op', '//');
                    case 'then':
                    case '?':
                        return this.to('ctxt_op', '?');
                    case 'else':
                    case ':':
                        return this.to('ctxt_op', ':');
                    case '$':
                        return this.to('ctxt_misc', '$');
                    case 'depth':
                    case 'd':
                        return this.to('ctxt_term', '$D');
                    case 'children':
                    case 'c':
                        return this.to('ctxt_term', '$C');
                    case 'index':
                    case 'i':
                        return this.to('ctxt_term', '$I');
                    case 'siblings':
                    case 'n':
                        return this.to('ctxt_term', '$N');
                    case 'random':
                    case 'q':
                        return this.to('ctxt_term', '$Q');
                    case 'shuffled':
                    case 's':
                        return this.to('ctxt_term', '$S');
                    case 'iterandom':
                    case 'r':
                        return this.to('ctxt_term', '$R');
                    case 'eq':
                    case '$==':
                        return this.to('ctxt_op', '$==');
                    case 'ne':
                    case '$!=':
                        return this.to('ctxt_op', '$!=');
                    case 'lt':
                    case '$<':
                        return this.to('ctxt_op', '$<');
                    case 'le':
                    case '$<=':
                        return this.to('ctxt_op', '$<=');
                    case 'gt':
                    case '$>':
                        return this.to('ctxt_op', '$>');
                    case 'ge':
                    case '$>=':
                        return this.to('ctxt_op', '$>=');
                    default:
                        return this.to(this.type, this.val);
                }
            default:
                return this.to(this.type, this.val);
        }
    }

    isContextToken() {
        const converted = this.toContextToken();
        return false ||
            converted.is('ctxt_term') ||
            converted.is('ctxt_op') ||
            converted.is('ctxt_misc')
        ;
    }

    isControlOpToken() {
        return false ||
            this.is('key', 'tridy') ||
            this.is('key', 'clear') ||
            this.is('key', 'exit')
        ;
    }

    isDefiningOpToken() {
        return false ||
            this.is('key', 'set') ||
            this.is('key', 'new')
        ;
    }

    isReadOpToken() {
        return false ||
            this.is('key', 'get')
        ;
    }

    isAffectingOpToken() {
        return false ||
            this.isReadOpToken() ||
            this.is('key', 'del')
        ;
    }

    isGeneralEditingOpToken() {
        return false ||
            this.is('key', 'put')
        ;
    }

    isTagEditingOpToken() {
        return false ||
            this.is('key', 'tag') ||
            this.is('key', 'untag')
        ;
    }

    isEditingOpToken() {
        return false ||
            this.isGeneralEditingOpToken() ||
            this.isTagEditingOpToken()
        ;
    }

    isRawInputStringToken() {
        return false ||
            this.is('lpart') ||
            this.is('mlpart') ||
            this.is('dynpart')
        ;
    }

    isRawInputToken() {
        return false ||
            this.is('key', 'xml') ||
            this.is('key', 'json') ||
            this.is('key', 'yaml') ||
            this.isRawInputStringToken()
        ;
    }

    isGetParameterToken() {
        return false ||
            this.is('key', 'raw') ||
            this.is('key', 'typeless') ||
            this.is('key', 'tagless') ||
            this.is('key', 'trimmed') ||
            this.is('key', 'merged') ||
            this.is('key', 'final')
        ;
    }

    isTagsetToken() {
        return false ||
            this.is('tag') ||
            this.is('key', 'uuid')
        ;
    }
}
