import { isNullish }                  from './common.js';
import { CONTEXT_MAP, OPERATION_MAP } from './mapped.js';

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

    getType() {
        return this.type;
    }

    getValue() {
        return this.val;
    }

    getSourceFile() {
        return this.debug.filepath;
    }

    is(type = null, value = null) {
        return (((this.type == type) || (type === null)) && ((this.val == value) || (value === null)));
    }

    isMacroTerminalContextToken() {
        return false ||
            this.is('ctxt_term', CONTEXT_MAP.RECURSIVE_WILDCARD)
        ;
    }

    isIdentifierOnlyTerminalContextToken() {
        return false ||
            this.is('ctxt_term', CONTEXT_MAP.WILDCARD) ||
            this.is('ctxt_term', CONTEXT_MAP.RECURSIVE_WILDCARD)
        ;
    }

    isValueOnlyTerminalContextToken() {
        return false ||
            this.is('ctxt_term', CONTEXT_MAP.VARIABLE_DEPTH) ||
            this.is('ctxt_term', CONTEXT_MAP.VARIABLE_CHILDREN) ||
            this.is('ctxt_term', CONTEXT_MAP.VARIABLE_INDEX) ||
            this.is('ctxt_term', CONTEXT_MAP.VARIABLE_SIBLINGS) ||
            this.is('ctxt_term', CONTEXT_MAP.VARIABLE_QUERY_RANDOM) ||
            this.is('ctxt_term', CONTEXT_MAP.VARIABLE_SHUFFLED_INDEX) ||
            this.is('ctxt_term', CONTEXT_MAP.VARIABLE_NEW_RANDOM)
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
            this.is('ctxt_op', CONTEXT_MAP.NOT)
        ;
    }

    isExpressionStarterContextToken() {
        return false ||
            this.isIdentifierTerminalContextToken() ||
            this.isUnaryOpContextToken() ||
            this.is('ctxt_misc', CONTEXT_MAP.LEFT_PARENTHESES) ||
            this.is('ctxt_misc', CONTEXT_MAP.VALUE_SYMBOL)
        ;
    }

    isExpressionEnderContextToken() {
        return false ||
            this.isIdentifierTerminalContextToken() ||
            this.is('ctxt_misc', CONTEXT_MAP.RIGHT_PARENTHESES)
        ;
    }

    isBasicBinaryOpContextToken() {
        return false ||
            this.is('ctxt_op', CONTEXT_MAP.AND) ||
            this.is('ctxt_op', CONTEXT_MAP.XOR) ||
            this.is('ctxt_op', CONTEXT_MAP.OR)
        ;
    }

    isLookaheadNestedOpContextToken() {
        return false ||
            this.is('ctxt_op', CONTEXT_MAP.LOOKAHEAD) ||
            this.is('ctxt_op', CONTEXT_MAP.RECURSIVE_LOOKAHEAD) ||
            this.is('ctxt_op', CONTEXT_MAP.INVERSE_LOOKAHEAD) ||
            this.is('ctxt_op', CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD)
        ;
    }

    isLookbehindNestedOpContextToken() {
        return false ||
            this.is('ctxt_op', CONTEXT_MAP.LOOKBEHIND) ||
            this.is('ctxt_op', CONTEXT_MAP.RECURSIVE_LOOKBEHIND) ||
            this.is('ctxt_op', CONTEXT_MAP.INVERSE_LOOKBEHIND) ||
            this.is('ctxt_op', CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND)
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
            this.is('ctxt_op', CONTEXT_MAP.TRANSITION) ||
            this.is('ctxt_op', CONTEXT_MAP.RECURSIVE_TRANSITION) ||
            this.is('ctxt_op', CONTEXT_MAP.INCLUSIVE_RECURSIVE_TRANSITION)
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

    isBinaryValueOpContextToken() {
        return false ||
            this.is('ctxt_op', CONTEXT_MAP.EQUAL_TO) ||
            this.is('ctxt_op', CONTEXT_MAP.NOT_EQUAL_TO) ||
            this.is('ctxt_op', CONTEXT_MAP.LESS_THAN) ||
            this.is('ctxt_op', CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO) ||
            this.is('ctxt_op', CONTEXT_MAP.GREATER_THAN) ||
            this.is('ctxt_op', CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO)
        ;
    }

    isBinaryOpContextToken() {
        return false ||
            this.isBinaryTagOpContextToken() ||
            this.isBinaryValueOpContextToken()
        ;
    }

    isTernaryFirstOpContextToken() {
        return this.is('ctxt_op', CONTEXT_MAP.TERNARY_1);
    }

    isTernarySecondOpContextToken() {
        return this.is('ctxt_op', CONTEXT_MAP.TERNARY_2);
    }

    /**
     * Using this as opposed to just creating a new token with the same type and value is useful because the debug information remains the same as the token created from.
     * This is useful for creating program-internal tokens that, when there is a problem related to them, the debug output can link back to the user-created token it was generated from.
     * The alternative is confusing the user with a token they never actually put in.
     */
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
                    case CONTEXT_MAP.LEFT_PARENTHESES:
                        return this.to('ctxt_misc', CONTEXT_MAP.LEFT_PARENTHESES);
                    case CONTEXT_MAP.RIGHT_PARENTHESES:
                        return this.to('ctxt_misc', CONTEXT_MAP.RIGHT_PARENTHESES);
                    case CONTEXT_MAP.WILDCARD_LONG:
                    case CONTEXT_MAP.WILDCARD:
                        return this.to('ctxt_term', CONTEXT_MAP.WILDCARD);
                    case CONTEXT_MAP.RECURSIVE_WILDCARD_LONG:
                    case CONTEXT_MAP.RECURSIVE_WILDCARD:
                        return this.to('ctxt_term', CONTEXT_MAP.RECURSIVE_WILDCARD);
                    case CONTEXT_MAP.NOT_LONG:
                    case CONTEXT_MAP.NOT:
                        return this.to('ctxt_op', CONTEXT_MAP.NOT);
                    case CONTEXT_MAP.AND_LONG:
                    case CONTEXT_MAP.AND:
                        return this.to('ctxt_op', CONTEXT_MAP.AND);
                    case CONTEXT_MAP.XOR_LONG:
                    case CONTEXT_MAP.XOR:
                        return this.to('ctxt_op', CONTEXT_MAP.XOR);
                    case CONTEXT_MAP.OR_LONG:
                    case CONTEXT_MAP.OR:
                    case CONTEXT_MAP.OR_EXTRA:
                        return this.to('ctxt_op', CONTEXT_MAP.OR);
                    case CONTEXT_MAP.LOOKAHEAD_LONG:
                    case CONTEXT_MAP.LOOKAHEAD:
                        return this.to('ctxt_op', CONTEXT_MAP.LOOKAHEAD);
                    case CONTEXT_MAP.RECURSIVE_LOOKAHEAD_LONG:
                    case CONTEXT_MAP.RECURSIVE_LOOKAHEAD:
                        return this.to('ctxt_op', CONTEXT_MAP.RECURSIVE_LOOKAHEAD);
                    case CONTEXT_MAP.LOOKBEHIND_LONG:
                    case CONTEXT_MAP.LOOKBEHIND:
                        return this.to('ctxt_op', CONTEXT_MAP.LOOKBEHIND);
                    case CONTEXT_MAP.RECURSIVE_LOOKBEHIND_LONG:
                    case CONTEXT_MAP.RECURSIVE_LOOKBEHIND:
                        return this.to('ctxt_op', CONTEXT_MAP.RECURSIVE_LOOKBEHIND);
                    case CONTEXT_MAP.INVERSE_LOOKAHEAD_LONG:
                    case CONTEXT_MAP.INVERSE_LOOKAHEAD:
                        return this.to('ctxt_op', CONTEXT_MAP.INVERSE_LOOKAHEAD);
                    case CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD_LONG:
                    case CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD:
                        return this.to('ctxt_op', CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD);
                    case CONTEXT_MAP.INVERSE_LOOKBEHIND_LONG:
                    case CONTEXT_MAP.INVERSE_LOOKBEHIND:
                        return this.to('ctxt_op', CONTEXT_MAP.INVERSE_LOOKBEHIND);
                    case CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND_LONG:
                    case CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND:
                        return this.to('ctxt_op', CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND);
                    case CONTEXT_MAP.TRANSITION_LONG:
                    case CONTEXT_MAP.TRANSITION:
                        return this.to('ctxt_op', CONTEXT_MAP.TRANSITION);
                    case CONTEXT_MAP.RECURSIVE_TRANSITION_LONG:
                    case CONTEXT_MAP.RECURSIVE_TRANSITION:
                        return this.to('ctxt_op', CONTEXT_MAP.RECURSIVE_TRANSITION);
                    case CONTEXT_MAP.INCLUSIVE_RECURSIVE_TRANSITION_LONG:
                    case CONTEXT_MAP.INCLUSIVE_RECURSIVE_TRANSITION:
                        return this.to('ctxt_op', CONTEXT_MAP.INCLUSIVE_RECURSIVE_TRANSITION);
                    case CONTEXT_MAP.TERNARY_1_LONG:
                    case CONTEXT_MAP.TERNARY_1:
                        return this.to('ctxt_op', CONTEXT_MAP.TERNARY_1);
                    case CONTEXT_MAP.TERNARY_2_LONG:
                    case CONTEXT_MAP.TERNARY_2:
                        return this.to('ctxt_op', CONTEXT_MAP.TERNARY_2);
                    case CONTEXT_MAP.VALUE_SYMBOL:
                        return this.to('ctxt_misc', CONTEXT_MAP.VALUE_SYMBOL);
                    case CONTEXT_MAP.VARIABLE_DEPTH_LONG:
                    case CONTEXT_MAP.VARIABLE_DEPTH_EXTRA:
                        return this.to('ctxt_term', CONTEXT_MAP.VARIABLE_DEPTH);
                    case CONTEXT_MAP.VARIABLE_CHILDREN_LONG:
                    case CONTEXT_MAP.VARIABLE_CHILDREN_EXTRA:
                        return this.to('ctxt_term', CONTEXT_MAP.VARIABLE_CHILDREN);
                    case CONTEXT_MAP.VARIABLE_INDEX_LONG:
                    case CONTEXT_MAP.VARIABLE_INDEX_EXTRA:
                        return this.to('ctxt_term', CONTEXT_MAP.VARIABLE_INDEX);
                    case CONTEXT_MAP.VARIABLE_SIBLINGS_LONG:
                    case CONTEXT_MAP.VARIABLE_SIBLINGS_EXTRA:
                        return this.to('ctxt_term', CONTEXT_MAP.VARIABLE_SIBLINGS);
                    case CONTEXT_MAP.VARIABLE_QUERY_RANDOM_LONG:
                    case CONTEXT_MAP.VARIABLE_QUERY_RANDOM_EXTRA:
                        return this.to('ctxt_term', CONTEXT_MAP.VARIABLE_QUERY_RANDOM);
                    case CONTEXT_MAP.VARIABLE_SHUFFLED_INDEX_LONG:
                    case CONTEXT_MAP.VARIABLE_SHUFFLED_INDEX_EXTRA:
                        return this.to('ctxt_term', CONTEXT_MAP.VARIABLE_SHUFFLED_INDEX);
                    case CONTEXT_MAP.VARIABLE_NEW_RANDOM_LONG:
                    case CONTEXT_MAP.VARIABLE_NEW_RANDOM_EXTRA:
                        return this.to('ctxt_term', CONTEXT_MAP.VARIABLE_NEW_RANDOM);
                    case CONTEXT_MAP.EQUAL_TO_LONG:
                    case CONTEXT_MAP.EQUAL_TO:
                        return this.to('ctxt_op', CONTEXT_MAP.EQUAL_TO);
                    case CONTEXT_MAP.NOT_EQUAL_TO_LONG:
                    case CONTEXT_MAP.NOT_EQUAL_TO:
                        return this.to('ctxt_op', CONTEXT_MAP.NOT_EQUAL_TO);
                    case CONTEXT_MAP.LESS_THAN_LONG:
                    case CONTEXT_MAP.LESS_THAN:
                        return this.to('ctxt_op', CONTEXT_MAP.LESS_THAN);
                    case CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO_LONG:
                    case CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO:
                        return this.to('ctxt_op', CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO);
                    case CONTEXT_MAP.GREATER_THAN_LONG:
                    case CONTEXT_MAP.GREATER_THAN:
                        return this.to('ctxt_op', CONTEXT_MAP.GREATER_THAN);
                    case CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO_LONG:
                    case CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO:
                        return this.to('ctxt_op', CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO);
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
            this.is('key', 'split') ||
            this.is('key', 'clear') ||
            this.is('key', 'exit')
        ;
    }

    isDefiningOpToken() {
        return false ||
            this.is('key', OPERATION_MAP.TEXT.OVERWRITE) ||
            this.is('key', OPERATION_MAP.TEXT.APPEND)
        ;
    }

    isReadOpToken() {
        return false ||
            this.is('key', OPERATION_MAP.TEXT.PRINT)
        ;
    }

    isAffectingOpToken() {
        return false ||
            this.isReadOpToken() ||
            this.is('key', OPERATION_MAP.TEXT.DELETE) ||
            this.is('key', OPERATION_MAP.TEXT.PRINT_STATISTICS)
        ;
    }

    isGeneralEditingOpToken() {
        return false ||
            this.is('key', OPERATION_MAP.TEXT.EDIT)
        ;
    }

    isTagEditingOpToken() {
        return false ||
            this.is('key', OPERATION_MAP.TEXT.EDIT_TAGS) ||
            this.is('key', OPERATION_MAP.TEXT.DELETE_TAGS)
        ;
    }

    isEditingOpToken() {
        return false ||
            this.isGeneralEditingOpToken() ||
            this.isTagEditingOpToken()
        ;
    }

    isCopyOpToken() {
        return false ||
            this.is('key', OPERATION_MAP.TEXT.CUT) ||
            this.is('key', OPERATION_MAP.TEXT.COPY)
        ;
    }

    isImportOpToken() {
        return false ||
            this.is('key', OPERATION_MAP.TEXT.IMPORT)
        ;
    }

    isRawInputSimpleStringToken() {
        return false ||
            this.is('lpart') ||
            this.is('mlpart')
        ;
    }

    isRawInputPrimitiveStringToken() {
        return false ||
            this.isRawInputSimpleStringToken() ||
            this.is('dynpart') ||
            this.is('tag')
        ;
    }

    isRawInputStringStartToken() {
        return false ||
            this.isRawInputSimpleStringToken() ||
            this.is('dynpart')
        ;
    }

    isRawInputStringToken() {
        return false ||
            this.isRawInputPrimitiveStringToken() ||
            this.is('datapart')
        ;
    }

    isRawInputMultilineStringToken() {
        return this.isRawInputStringToken();
    }

    isRawInputStartToken() {
        return false ||
            this.is('key', 'json') ||
            this.is('key', 'yaml') ||
            this.is('key', 'xml') ||
            this.is('key', 'text') ||
            this.isRawInputStringStartToken()
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

    static getPosString(pos) {
        let str = '';

        if (!isNullish(pos.filepath)) {
            str += `${pos.filepath}, `;
        }
        str += `line ${pos.line}, col ${pos.col}`;

        return str;
    }
}
