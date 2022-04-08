import { v4 as uuidv4 } from 'uuid';

import { StateTree } from './StateTree.js';

import { isArray, alias, deepCopy, isEmpty } from '../utility/common.js';
import { Stack }                             from '../utility/Stack.js';

class Composer {
    constructor() {
        this.target = new Stack();
        this.target.push(new StateTree());

        this.nested_deleted = false;
    }

    createModule(command) {
        const module = new StateTree();

        this.astree.enterPos('imported');
        if (!this.astree.isPosEmpty()) {
            module.setPosValue(this.astree.getPosValue());
        }
        this.astree.leavePos();

        this.astree.enterPos('definition');
        if (!this.astree.isPosEmpty()) {
            this.astree.enterPos(alias.nested);
            if (!this.astree.isPosEmpty()) {
                this.astree.leavePos();

                this.target.push(module);
                this.parse();
                this.target.pop();
            } else {
                this.astree.leavePos();
            }

            this.astree.enterCopyAndLeave(module, [alias.state]);
            this.astree.enterCopyAndLeave(module, [alias.tags]);

            module.leavePos();
        }
        this.astree.leavePos();

        return module.getRaw();
    }

    getContext() {
        let current = [ ];

        const target  = this.target.peek();
        const indices = target.getFullPos();
        let   ptr     = target.getRaw();
        
        for (let i = 0; i < indices.length; i += 2) {
            ptr = ptr[indices[i]][indices[i + 1]];
            if (isEmpty(ptr[alias.tags])) {
                current.push([ ]);
            } else {
                current.push(ptr[alias.tags]);
            }
        }

        return current;
    }

    isTag(obj) {
        return (typeof obj === 'string');
    }

    matchingTag(answers, test, tested, lvl) {
        switch (test) {
            case '*':
                answers.value = true;
                break;
            case '~':
                answers.value = lvl === 0;
                break;
            case '%':
                answers.value = isEmpty(this.target.peek().enterGetAndLeave([alias.nested]));
                break;
            case '?':
                answers.value = (Math.random() >= 0.5);
                break;
            default:
                answers.value = false;
                if (!isEmpty(tested[lvl])) {
                    for (const tag of tested[lvl]) {
                        if (test == tag) {
                            answers.value = true;
                            break;
                        }
                    }
                }
                break;
        }
        answers.valid = lvl === (tested.length - 1);
    }

    testNot(answers, a, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        answers.value = !a_answers.value;
        answers.valid = a_answers.valid;
    }

    testAnd(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);
        
        const b_answers = { value: false, valid: true };
        if (a_answers.value === true) {
            this.matchingExpression(b_answers, b, tested, lvl);
        }

        answers.value = a_answers.value && b_answers.value;
        answers.valid = a_answers.valid && b_answers.valid;
    }

    testXor(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        this.matchingExpression(b_answers, b, tested, lvl);

        answers.value = (!a_answers.value && b_answers.value) || (a_answers.value && !b_answers.value);
        answers.valid = a_answers.value ? a_answers.valid : b_answers.valid;
    }

    testOr(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        if (a_answers.value === false) {
            this.matchingExpression(b_answers, b, tested, lvl);
        }

        answers.value = a_answers.value || b_answers.value;
        answers.valid = (a_answers.value && a_answers.valid) || (b_answers.value && b_answers.valid) || (a_answers.valid && b_answers.valid);
    }

    testParentMain(answers, b, tested, lvl, opts = { }) {
        opts.recurse = opts.recurse ?? false;

        const target = this.target.peek();
        target.enterPos(alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosEmpty()) {
                tested = this.getContext();
                this.matchingExpression(answers, b, tested, lvl);
                if (opts.recurse && (answers.value === false)) {
                    this.testParentMain(answers, b, tested, lvl + 1, opts);
                }
                if (answers.value === true) {
                    break;
                }

                target.nextItem();
            }
            target.leavePos();
        }
        target.leavePos();
    }

    testParent(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        if (a_answers.value === true) {
            this.testParentMain(b_answers, b, tested, lvl + 1, { recurse: false });
        }

        answers.value = a_answers.value && b_answers.value;
        answers.valid = a_answers.valid;
    }

    testAscend(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        if (a_answers.value === true) {
            this.testParentMain(b_answers, b, tested, lvl + 1, { recurse: true });
        }

        answers.value = a_answers.value && b_answers.value;
        answers.valid = a_answers.valid;
    }

    testChild(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        if (a_answers.value === true) {
            this.matchingExpression(b_answers, b, tested, lvl - 1);
        }

        answers.value = a_answers.value && b_answers.value;
        answers.valid = a_answers.valid;
    }

    testDescend(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        if (a_answers.value === true) {
            lvl--;
            while ((b_answers.value === false) && (lvl >= 0)) {
                this.matchingExpression(b_answers, b, tested, lvl);
                lvl--;
            }
        }

        answers.value = a_answers.value && b_answers.value;
        answers.valid = a_answers.valid;
    }

    testTo(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        if (a_answers.value === true) {
            this.matchingExpression(b_answers, b, tested, lvl + 1);
        }

        answers.value = a_answers.value && b_answers.value;
        answers.valid = b_answers.valid;
    }

    testToward(answers, a, b, tested, lvl) {
        const a_answers = { value: false, valid: true };
        this.matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, valid: true };
        if (a_answers.value === true) {
            lvl++;
            while (((b_answers.value === false) || (b_answers.valid === false)) && (lvl < tested.length)) {
                this.matchingExpression(b_answers, b, tested, lvl);
                lvl++;
            }
        }

        answers.value = a_answers.value && b_answers.value;
        answers.valid = b_answers.valid;
    }

    matchingExpression(answers, test, tested, lvl) {
        if (isEmpty(test)) {
            answers.value = isEmpty(tested);
            answers.valid = answers.value;
        } else if (isEmpty(tested) || (lvl < 0) || (lvl >= tested.length)) {
            answers.value = false;
            answers.valid = true;
        } else if (typeof test === 'boolean') {
            answers.value = test;
        } else if (this.isTag(test)) {
            this.matchingTag(answers, test, tested, lvl);
        } else {
            switch (test.op) {
                case '!':
                    this.testNot(answers, test.a, tested, lvl);
                    break;
                case '&':
                    this.testAnd(answers, test.a, test.b, tested, lvl);
                    break;
                case '^':
                    this.testXor(answers, test.a, test.b, tested, lvl);
                    break;
                case '|':
                    this.testOr(answers, test.a, test.b, tested, lvl);
                    break;
                case '>':
                    this.testParent(answers, test.a, test.b, tested, lvl);
                    break;
                case '>>':
                    this.testAscend(answers, test.a, test.b, tested, lvl);
                    break;
                case '<':
                    this.testChild(answers, test.a, test.b, tested, lvl);
                    break;
                case '<<':
                    this.testDescend(answers, test.a, test.b, tested, lvl);
                    break;
                case '/':
                    this.testTo(answers, test.a, test.b, tested, lvl);
                    break;
                case '//':
                    this.testToward(answers, test.a, test.b, tested, lvl);
                    break;
            }
        }
    }

    uniqueCopy(template) {
        const copy = deepCopy(template);

        const tags = copy[alias.tags];
        if (isArray(tags)) {
            for (const i in tags) {
                if (tags[i] === '@uuid') {
                    tags[i] = uuidv4();
                }
            }
        }

        return copy;
    }

    composeModule(command, opts = { }) {
        opts.template = opts.template ?? null;

        const target = this.target.peek();
        switch (command) {
            case 'edit':
                target.setPosValue(this.uniqueCopy(opts.template));
                break;
            case 'module':
                target.enterPutAndLeave([alias.nested], this.uniqueCopy(opts.template));
                break;
            case 'print':
                this.output.push(deepCopy(target.getPosValue()));
                break;
            case 'delete':
                const spliced = target.getTopPos();
                if (spliced === null) {
                    target.setPosValue({ });
                } else if (spliced === 0) {
                    target.leavePos();
                    target.setPosValue(undefined);
                    this.nested_deleted = true;
                } else {
                    target.leavePos();
                    target.getPosValue().splice(spliced, 1);
                    target.enterPos(spliced - 1);
                }
                break;
        }
    }

    traverseModule(test, command, opts = { }) {
        opts.template = opts.template ?? null;
        opts.greedy   = opts.greedy ?? false;

        const answers = { value: false, valid: false };
        this.matchingExpression(answers, test, this.getContext(), 0);

        let   matched      = answers.value && answers.valid;
        const matched_this = matched;
        if (!opts.greedy || !matched) {
            const target = this.target.peek();
            target.enterPos(alias.nested);
            if (!target.isPosEmpty()) {
                target.enterPos(0);
                while (!target.isPosEmpty()) {
                    matched = this.traverseModule(test, command, { template: opts.template, greedy: opts.greedy });
                    if ((opts.greedy && matched) || this.nested_deleted) {
                        break;
                    } else {
                        target.nextItem();
                    }
                }
                if (this.nested_deleted) {
                    this.nested_deleted = false;
                } else {
                    target.leavePos();
                }
            }
            target.leavePos();
        }

        if (matched_this) {
            this.composeModule(command, { template: opts.template });
        }

        return matched;
    }

    isReadOp(command) {
        switch (command) {
            case 'print':
                return true;
            default:
                return false;
        }
    }

    parseStatement() {
        const context    = this.astree.enterGetAndLeave(['context']);
        const expression = context ? context.expression : undefined;
        const greedy     = context ? context.greedy : undefined;

        const command = this.astree.enterGetAndLeave(['operation']);

        let template;
        if (this.isReadOp(command)) {
            template = null;
        } else {
            template = this.createModule(command);
        }

        this.traverseModule(expression, command, { template: template, greedy: greedy });
    }

    parse() {
        this.astree.enterPos(alias.nested);
        if (!this.astree.isPosEmpty()) {
            this.astree.enterPos(0);
            while (!this.astree.isPosEmpty()) {
                this.parseStatement();
                if (this.nested_deleted) {
                    break;
                } else {
                    this.astree.nextItem();
                }
            }
            if (!this.nested_deleted) {
                this.astree.leavePos();
            }
        }
        this.astree.leavePos();
    }

    compose(input, opts = { }) {
        this.astree = input;
        this.output = [ ];
        this.parse();
        return this.output;
    }
}

export const composer = new Composer();
