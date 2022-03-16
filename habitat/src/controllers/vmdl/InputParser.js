import { parser as tokenParser } from './TokenParser.js';
import { parser as infixParser } from './InfixParser.js';
import { AbstractSyntaxTree }    from './AbstractSyntaxTree.js';
import { SyntaxError }           from '../../utility/error.js';

class InputParser {
    tree        = new AbstractSyntaxTree();
    carry       = [ ];
    last_depth  = 0;
    last_ended  = false;

    constructor() {
        this.parser       = tokenParser;
        this.infix_parser = infixParser;
    }

    load(input) {
        this.parser.load(input);
    }

    carryIsEmpty() {
        return this.carry.length == 0;
    }

    parse(opts = { }) {
        opts.accept_carry = opts.accept_carry ?? false;

        const tokens = [ ];

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
                this.tree.leavePos();
                parseTreeMain(token);
            }

            const parseTreeInit = (token) => {
                this.tree.assertPos(['stmt', 'init']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'vmdl':
                                this.tree.leavePos();
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
                this.tree.assertPos(['stmt']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'in':
                                this.tree.enterPos('context');
                                break;
                            case 'new':
                                this.tree.enterPos('operation');
                                this.tree.setPosValue('create');
                                this.tree.leavePos();
                                this.tree.enterPos('definition');
                                break;
                            case 'now':
                                this.tree.enterPos('operation');
                                this.tree.setPosValue('update');
                                this.tree.leavePos();
                                this.tree.enterPos('definition');
                                break;
                            case 'no':
                                this.tree.enterPos('operation');
                                this.tree.setPosValue('delete');
                                this.tree.leavePos();
                                this.tree.enterPos('affect');
                                break;
                            default:
                                throw new SyntaxError(`Unexpected keyword "${token.val}".`);
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                this.tree.nextItem();
                                break;
                            case '}':
                                this.tree.leaveStack();
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
                this.tree.assertPos(['stmt', 'context']);

                const autoPutAnd = () => {
                    if (expression && ((previous.type == 't') || (previous.val == ')'))) {
                        this.tree.putPosValue({ type: 'o', val: '&' }, { ready: false });
                    }
                }

                const finalizeExpression = () => {
                    if (!expression) {
                        throw new SyntaxError(`Missing context expression (required after @IN).`);
                    }

                    this.infix_parser.load(expression);
                    const postfix = this.infix_parser.parse();
                    this.tree.setPosValue(postfix, { ready: true });
                }

                const failIfNoPrecedingTags = () => {
                    if (!expression || ((previous.type != 't') && (previous.val != ')'))) {
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

                const expression = this.tree.getPosValue();

                let previous;
                if (expression) {
                    previous = expression[expression.length - 1];
                }

                switch (token.type) {
                    case 'tag':
                        autoPutAnd();
                        this.tree.putPosValue({ type: 't', val: token.val });
                        break;
                    case 'key':
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                failIfNoPrecedingTags();
                                finalizeExpression();
                                this.tree.leavePos();
                                this.tree.enterPos('operation');
                                this.tree.setPosValue('cswitch');
                                this.tree.nextItem();
                                break;
                            case '(':
                                autoPutAnd();
                                this.tree.putPosValue({ type: 'o', val: '(' }, { ready: false });
                                break;
                            case ')':
                                failIfNoPrecedingTags();
                                failIfNoPrecedingLeftParentheses();
                                this.tree.putPosValue({ type: 'o', val: ')' }, { ready: true });
                                break;
                            case 'not':
                            case '!':
                                autoPutAnd();
                                this.tree.putPosValue({ type: 'o', val: '!' }, { ready: false });
                                break;
                            case 'and':
                            case '&':
                                failIfNoPrecedingTags();
                                this.tree.putPosValue({ type: 'o', val: '&' }, { ready: false });
                                break;
                            case 'or':
                            case '|':
                            case ',':
                                failIfNoPrecedingTags();
                                this.tree.putPosValue({ type: 'o', val: '|' }, { ready: false });
                                break;
                            case 'of':
                            case '.':
                                failIfNoPrecedingTags();
                                this.tree.putPosValue({ type: 'o', val: '.' }, { ready: false });
                                break;
                            case 'from':
                            case ':':
                            case '..':
                                failIfNoPrecedingTags();
                                this.tree.putPosValue({ type: 'o', val: ':' }, { ready: false });
                                break;
                            case 'any':
                            case '*':
                                autoPutAnd();
                                this.tree.putPosValue({ type: 't', val: '*' }, { ready: true });
                                break;
                            case 'all':
                            case '**':
                                autoPutAnd();
                                this.tree.putPosValue({ type: 't', val: '**' }, { ready: true });
                                break;
                            case 'leaf':
                            case '***':
                                autoPutAnd();
                                this.tree.putPosValue({ type: 't', val: '***' }, { ready: true });
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
                this.tree.assertPos(['stmt', 'definition']);
                
                switch (token.type) {
                    case 'tag':
                        this.tree.enterPos('sys');
                        this.tree.setPosValue(token.val);
                        this.tree.leavePos();
                        this.tree.enterPos('tags');
                        this.tree.putPosValue(token.val, { final: false });
                        this.tree.leavePos();
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'as':
                                this.tree.enterPos('tags');
                                this.tree.setPosValue([ ]);
                                break;
                            case 'is':
                                this.tree.enterPos('heap');
                                break;
                            case 'has':
                                this.tree.enterPos('stack');
                                break;
                            default:
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                this.tree.nextItem();
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
                this.tree.assertPos(['stmt', 'affect']);
                
                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'machine':
                                this.tree.setPosValue('machine');
                                this.tree.leavePos();
                                break;
                            case 'tags':
                                this.tree.setPosValue('tags');
                                this.tree.leavePos();
                                break;
                            case 'heap':
                                this.tree.setPosValue('heap');
                                this.tree.leavePos();
                                break;
                            case 'stack':
                                this.tree.setPosValue('stack');
                                this.tree.leavePos();
                                break;
                            default:
                                throw new SyntaxError(`Unexpected keyword "${token.val}".`);
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                this.tree.nextItem();
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
                this.tree.assertPos(['stmt', 'definition', 'tags']);

                switch (token.type) {
                    case 'tag':
                        this.tree.putPosValue(token.val);
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'none':
                                this.tree.leavePos();
                                break;
                            default:
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                this.tree.nextItem();
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
                this.tree.assertPos(['stmt', 'definition', 'heap']);

                switch (token.type) {
                    case 'key':
                        switch (token.val) {
                            case 'json':
                                this.tree.enterPos('type');
                                this.tree.setPosValue('json');
                                this.tree.leavePos();
                                this.tree.enterPos('data');
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
                this.tree.assertPos(['stmt', 'definition', 'heap', 'data']);

                switch (token.type) {
                    case 'part':
                        this.tree.putPosValue(token);
                        break;
                    case 'key':
                        switch (token.val) {
                            case 'end':
                                this.tree.leavePos();
                                this.tree.leavePos();
                                break;
                            case 'seqnum':
                            case 'sysseqnum':
                            case 'depth':
                            case 'uuid':
                            case 'root':
                            case 'farthest':
                            case 'closest':
                            case 'parent':
                                this.tree.putPosValue(token);
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
                this.tree.assertPos(['stmt', 'definition', 'stack']);

                switch (token.type) {
                    case 'punc':
                        switch (token.val) {
                            case '{':
                                this.tree.enterStack();
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
                switch (this.tree.getTopPos()) {
                    case 'init':
                        parseTreeInit(token);
                        break;
                    case 'stmt':
                        parseTreeRoot(token);
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
                }
            }

            if (tokens.length > 0) {
                this.tree.enterStack();
                this.tree.enterPos('init');

                for (const token of tokens) {
                    parseTreeMain(token);
                }

                this.tree.leaveStack({ root: true });
            }

            return this.tree.getRaw();
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
