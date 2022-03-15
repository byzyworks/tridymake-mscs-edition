import { parser as tokenParser } from './TokenParser.js';
import { parser as infixParser } from './InfixParser.js';
import { AbstractSyntaxTree } from './AbstractSyntaxTree.js';

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

        const badInput = (msg) => {
            throw new Error(msg);
        }

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
                badInput();
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
                                this.tree.badInput();
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
                                this.tree.badInput();
                        }
                        break;
                    default:
                        this.tree.badInput();
                }
            }

            const parseTreeContext = (token) => {
                this.tree.assertPos(['stmt', 'context']);

                const autoPutAnd = () => {
                    const context_tokens = this.tree.getPosValue();
                    if (context_tokens) {
                        const last_token = context_tokens[context_tokens.length - 1];
                        if (last_token && ((last_token.type == 't') || (last_token.val == ')'))) {
                            this.tree.putPosValue({ type: 'o', val: '&' }, { ready: false });
                        }
                    }
                }

                const finalizeExpression = () => {
                    this.infix_parser.load(this.tree.getPosValue());
                    const postfix = this.infix_parser.parse();
                    this.tree.setPosValue(postfix, { ready: true });
                }

                const failIfNoPrecedingTags = () => {
                    const current = this.tree.getPosValue();
                    if (!current || (current[current.length - 1].type != 't')) {
                        this.tree.badInput();
                    }
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
                            case '>':
                                failIfNoPrecedingTags();
                                this.tree.putPosValue({ type: 'o', val: '.' }, { ready: false });
                                break;
                            case 'from':
                            case '..':
                            case '>>':
                                failIfNoPrecedingTags();
                                this.tree.putPosValue({ type: 'o', val: '>' }, { ready: false });
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
                                finalizeExpression();
                                leaveTreePosAndRetry(token);
                                break;
                        }
                        break;
                    default:
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
                                this.tree.badInput();
                        }
                        break;
                    case 'punc':
                        switch (token.val) {
                            case ';':
                                this.tree.setPosValue('any');
                                this.tree.nextItem();
                                break;
                            default:
                                this.tree.badInput();
                        }
                        break;
                    default:
                        this.tree.badInput();
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
                                this.tree.badInput();
                        }
                        break;
                    default:
                        this.tree.badInput();
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
                                this.tree.badInput();
                        }
                        break;
                    default:
                        this.tree.badInput();
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
                                this.tree.badInput();
                        }
                        break;
                    default:
                        this.tree.badInput();
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

                for (let token of tokens) {
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
