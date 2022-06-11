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

    isUnaryOpContextToken() {
        return false ||
            this.is('ctxt_op', '!')
        ;
    }

    isExpressionStarterContextToken() {
        return false ||
            this.is('ctxt_term') ||
            this.isUnaryOpContextToken() ||
            this.is('ctxt_misc', '(') ||
            this.is('ctxt_misc', '$')
        ;
    }

    isExpressionEnderContextToken() {
        return false ||
            this.is('ctxt_term') ||
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

    to(type, val) {
        return new Token(type, val, this.debug);
    }

    toContextToken() {
        switch (this.type) {
            case 'tag':
            case 'num':
                return this.to('ctxt_term', this.val);
            case 'key':
            case 'sym':
                switch (this.val) {
                    case 'any':
                    case '*':
                        return this.to('ctxt_term', '*');
                    case 'root':
                    case '~':
                        return this.to('ctxt_term', '~');
                    case 'leaf':
                    case '%':
                        return this.to('ctxt_term', '%');
                    case 'random':
                    case '?':
                        return this.to('ctxt_term', '?');
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
                    case '$':
                        return this.to('ctxt_misc', '$');
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
                    case '(':
                        return this.to('ctxt_misc', '(');
                    case ')':
                        return this.to('ctxt_misc', ')');
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
