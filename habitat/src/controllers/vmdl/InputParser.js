import { parser as tokenParser } from './TokenParser.js';
import { parser as infixParser } from './InfixParser.js';
import { StateTree }             from './StateTree.js';
import { isEmpty }               from '../../utility/common.js';
import { SyntaxError }           from '../../utility/error.js';

class InputParser {
    carry      = [ ];
    last_depth = 0;
    last_ended = false;

    constructor() {
        this.parser       = tokenParser;
        this.infix_parser = infixParser;
    }

    load(input) {
        this.parser.load(input);
    }

    carryIsEmpty() {
        return this.carry.length === 0;
    }

    parse(opts = { }) {
        opts.accept_carry = opts.accept_carry ?? false;

        const tokens = [ ];
        const astree = new StateTree();

        const parseTokensWithCarry = () => {
            const pool = [ ];

            let token;

            for (token of this.carry) {
                pool.push(token);
            }
            
            while (token = this.parser.next()) {
                pool.push(token);
            }

            let idx;

            let stmt_cutoff = null;
            for (idx = this.carry.length; idx < pool.length; idx++) {
                if (pool[idx].val == '{') {
                    this.last_depth++;
                } else if (pool[idx].val == '}') {
                    this.last_depth--;
                }

                if (pool[idx].val == ';') {
                    this.last_ended = true;
                } else {
                    this.last_ended = false;
                }

                if (this.last_ended && this.last_depth == 0) {
                    stmt_cutoff = idx;
                }
            }

            this.carry = [ ];

            if (stmt_cutoff) {
                for (idx = 0; idx <= stmt_cutoff; idx++) {
                    tokens.push(pool[idx]);
                }
                for (idx = stmt_cutoff + 1; idx < pool.length; idx++) {
                    this.carry.push(pool[idx]);
                }
            } else {
                for (idx = 0; idx < pool.length; idx++) {
                    this.carry.push(pool[idx]);
                }
            }
        }

        const parseTokensWithoutCarry = () => {
            let carry_needed = false;

            let token;
            while (token = this.parser.next()) {
                tokens.push(token);
                
                if (token.val == '{') {
                    this.last_depth++;
                } else if (token.val == '}') {
                    this.last_depth--;
                }

                if (token.val == ';') {
                    this.last_ended = true;
                } else {
                    this.last_ended = false;
                }

                if (this.last_ended && this.last_depth == 0) {
                    carry_needed = false;
                } else {
                    carry_needed = true;
                }
            }
            
            if (carry_needed) {
                throw new SyntaxError(`The input given contains an incomplete VMDL statement (missing final ";" or "}").`);
            }
        }

        const parseTree = () => {
            const leaveTreePosAndRetry = (token) => {
                astree.leavePos();
                parseTreeMain(token);
            }

            const parseTreeInit = (token) => {
                astree.assertPos(['init']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'vmdl':
                                astree.leavePos();
                                break;
                            case 'exit':
                                process.exit(0);
                            default:
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    default:
                        leaveTreePosAndRetry(token);
                        break;
                }
            }

            const parseTreeRoot = (token) => {
                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'in':
                                astree.enterPos('context');
                                break;
                            case 'new':
                                astree.enterPos('operation');
                                astree.setPosValue('create');
                                astree.leavePos();
                                astree.enterPos('definition');
                                break;
                            case 'now':
                                astree.enterPos('operation');
                                astree.setPosValue('update');
                                astree.leavePos();
                                astree.enterPos('definition');
                                break;
                            case 'no':
                                astree.enterPos('operation');
                                astree.setPosValue('delete');
                                astree.leavePos();
                                astree.enterPos('affect');
                                break;
                            default:
                                throw new SyntaxError(`Unexpected keyword "${token.val}".`);
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                astree.nextItem();
                                break;
                            case '}':
                                astree.leaveStack();
                                break;
                            default:
                                throw new SyntaxError(`Unexpected token "${token.val}".`);
                        }
                        break;
                    default:
                        throw new SyntaxError(`Unexpected token "${token.val}".`);
                }
            }

            const parseTreeContext = (token) => {
                astree.assertPos(['context']);

                const autoPutAnd = () => {
                    if (!isEmpty(expression) && ((previous.type == 't') || (previous.val == ')'))) {
                        astree.putPosValue({ type: 'o', val: '&' }, { ready: false });
                    }
                }

                const finalizeExpression = () => {
                    if (isEmpty(expression)) {
                        throw new SyntaxError(`Missing context expression (required after @IN).`);
                    }

                    this.infix_parser.load(expression);
                    const postfix = this.infix_parser.parse();
                    astree.setPosValue(postfix, { ready: true });
                }

                const failIfNoPrecedingTags = () => {
                    if (isEmpty(expression) || ((previous.type != 't') && (previous.val != ')'))) {
                        throw new SyntaxError(`Unexpected operator "${token.val}" - this needs to follow a tag.`);
                    }
                }

                const failIfNoPrecedingLeftParentheses = () => {
                    let counter = 0;
                    for (let token of expression) {
                        if (token.val == '(') {
                            counter++;
                        } else if (token.val == ')') {
                            counter--;
                        }

                        if (counter < 0) {
                            throw new SyntaxError(`Unexpected operator "${token.val}" - this needs to follow a matching left parentheses.`);
                        }
                    }
                }

                const expression = astree.getPosValue();

                let previous;
                if (!isEmpty(expression)) {
                    previous = expression[expression.length - 1];
                }

                switch (token.type) {
                    case 'tag':
                        autoPutAnd();
                        astree.putPosValue({ type: 't', val: token.val });
                        break;
                    case 'key':
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                failIfNoPrecedingTags();
                                finalizeExpression();
                                astree.leavePos();
                                astree.enterPos('operation');
                                astree.setPosValue('cswitch');
                                astree.nextItem();
                                break;
                            case '(':
                                autoPutAnd();
                                astree.putPosValue({ type: 'o', val: '(' }, { ready: false });
                                break;
                            case ')':
                                failIfNoPrecedingTags();
                                failIfNoPrecedingLeftParentheses();
                                astree.putPosValue({ type: 'o', val: ')' }, { ready: true });
                                break;
                            case 'not':
                            case '!':
                                autoPutAnd();
                                astree.putPosValue({ type: 'o', val: '!' }, { ready: false });
                                break;
                            case 'and':
                            case '&':
                                failIfNoPrecedingTags();
                                astree.putPosValue({ type: 'o', val: '&' }, { ready: false });
                                break;
                            case 'or':
                            case '|':
                            case ',':
                                failIfNoPrecedingTags();
                                astree.putPosValue({ type: 'o', val: '|' }, { ready: false });
                                break;
                            case 'of':
                            case '.':
                                failIfNoPrecedingTags();
                                astree.putPosValue({ type: 'o', val: '.' }, { ready: false });
                                break;
                            case 'from':
                            case ':':
                            case '..':
                                failIfNoPrecedingTags();
                                astree.putPosValue({ type: 'o', val: ':' }, { ready: false });
                                break;
                            case 'any':
                            case '*':
                                autoPutAnd();
                                astree.putPosValue({ type: 't', val: '*' }, { ready: true });
                                break;
                            case 'all':
                            case '**':
                                autoPutAnd();
                                astree.putPosValue({ type: 't', val: '**' }, { ready: true });
                                break;
                            case 'leaf':
                            case '***':
                                autoPutAnd();
                                astree.putPosValue({ type: 't', val: '***' }, { ready: true });
                                break;
                            default:
                                failIfNoPrecedingTags();
                                finalizeExpression();
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    default:
                        failIfNoPrecedingTags();
                        finalizeExpression();
                        leaveTreePosAndRetry(token);
                        break;
                }
            }

            const parseTreeDefinition = (token) => {
                astree.assertPos(['definition']);
                
                switch (token.type) {
                    case 'tag':
                        astree.enterPos('sys');
                        astree.setPosValue(token.val);
                        astree.leavePos();
                        astree.enterPos('tags');
                        astree.putPosValue(token.val, { final: false });
                        astree.leavePos();
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'as':
                                astree.enterPos('tags');
                                astree.setPosValue([ ]);
                                break;
                            case 'is':
                                astree.enterPos('heap');
                                break;
                            case 'has':
                                astree.enterPos('stack');
                                break;
                            default:
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                astree.nextItem();
                                break;
                            default:
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    default:
                        leaveTreePosAndRetry(token);
                        break;
                }
            }

            const parseTreeAffect = (token) => {
                astree.assertPos(['affect']);
                
                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'machine':
                                astree.setPosValue('machine');
                                astree.leavePos();
                                break;
                            case 'tags':
                                astree.setPosValue('tags');
                                astree.leavePos();
                                break;
                            case 'heap':
                                astree.setPosValue('heap');
                                astree.leavePos();
                                break;
                            case 'stack':
                                astree.setPosValue('stack');
                                astree.leavePos();
                                break;
                            default:
                                throw new SyntaxError(`Unexpected keyword "${token.val}".`);
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                astree.nextItem();
                                break;
                            default:
                                throw new SyntaxError(`Unexpected token "${token.val}".`);
                        }
                        break;
                    default:
                        throw new SyntaxError(`Unexpected token "${token.val}".`);
                }
            }

            const parseTreeTagsDefinition = (token) => {
                astree.assertPos(['definition', 'tags']);

                switch (token.type) {
                    case 'tag':
                        astree.putPosValue(token.val);
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'none':
                                astree.leavePos();
                                break;
                            default:
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                astree.nextItem();
                                break;
                            default:
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    default:
                        leaveTreePosAndRetry(token);
                        break;
                }
            }

            const parseTreeHeapDefinition = (token) => {
                astree.assertPos(['definition', 'heap']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'json':
                                astree.enterPos('type');
                                astree.setPosValue('json');
                                astree.leavePos();
                                astree.enterPos('data');
                                break;
                            default:
                                throw new SyntaxError(`Unexpected keyword "${token.val}".`);
                        }
                        break;
                    default:
                        throw new SyntaxError(`Unexpected token "${token.val}".`);
                }
            }

            const parseTreeHeapDataDefinition = (token) => {
                astree.assertPos(['definition', 'heap', 'data']);

                switch (token.type) {
                    case 'part':
                        astree.putPosValue(token);
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'end':
                                astree.leavePos();
                                astree.leavePos();
                                break;
                            case 'seqnum':
                            case 'sysseqnum':
                            case 'depth':
                            case 'uuid':
                            case 'root':
                            case 'farthest':
                            case 'closest':
                            case 'parent':
                                astree.putPosValue(token);
                                break;
                            default:
                                throw new SyntaxError(`Unexpected keyword "${token.val}".`);
                        }
                        break;
                    default:
                        throw new SyntaxError(`Unexpected token "${token.val}".`);
                }
            }

            const parseTreeStackDefinition = (token) => {
                astree.assertPos(['definition', 'stack']);

                switch (token.type) {
                    case 'punc':
                        switch (token.val) {
                            case '{':
                                astree.enterStack();
                                break;
                            default:
                                throw new SyntaxError(`Unexpected token "${token.val}".`);
                        }
                        break;
                    default:
                        throw new SyntaxError(`Unexpected token "${token.val}".`);
                }
            }

            const parseTreeMain = (token) => {
                switch (astree.getTopPos()) {
                    case 'init':
                        parseTreeInit(token);
                        break;
                    case 'context':
                        parseTreeContext(token);
                        break;
                    case 'definition':
                        parseTreeDefinition(token);
                        break;
                    case 'affect':
                        parseTreeAffected(token);
                        break;
                    case 'tags':
                        parseTreeTagsDefinition(token);
                        break;
                    case 'heap':
                        parseTreeHeapDefinition(token);
                        break;
                    case 'data':
                        parseTreeHeapDataDefinition(token);
                        break;
                    case 'stack':
                        parseTreeStackDefinition(token);
                        break;
                    default:
                        parseTreeRoot(token);
                        break;
                }
            }

            if (tokens.length > 0) {
                astree.enterStack();
                astree.enterPos('init');

                for (const token of tokens) {
                    parseTreeMain(token);
                }

                astree.leaveStack({ root: true });
            }

            return astree.getRaw();
        }

        if (opts.accept_carry) {
            parseTokensWithCarry();
        } else {
            parseTokensWithoutCarry();
        }
        return parseTree();
    }
}

export const parser = new InputParser();
