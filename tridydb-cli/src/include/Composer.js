import { v4 as uuidv4 } from 'uuid';

import { StateTree } from './StateTree.js';

import { isArray, alias, deepCopy, isEmpty } from '../utility/common.js';
import { Stack }                             from '../utility/Stack.js';

class Composer {
    constructor() {
        this._target = new Stack();
        this._target.push(new StateTree());

        this._nested_deleted = false;
    }
    
    _createModule(command) {
        const module = new StateTree();

        this._astree.enterPos('raw');
        if (!this._astree.isPosEmpty()) {
            module.setPosValue(this._astree.getPosValue());
        }
        this._astree.leavePos();

        this._astree.enterPos('definition');
        if (!this._astree.isPosEmpty()) {
            this._astree.enterPos(alias.nested);
            if (!this._astree.isPosEmpty()) {
                this._astree.leavePos();

                this._target.push(module);
                this._parse();
                this._target.pop();
            } else {
                this._astree.leavePos();
            }

            this._astree.enterCopyAndLeave(module, [alias.state]);
            this._astree.enterCopyAndLeave(module, [alias.tags]);

            module.leavePos();
        }
        this._astree.leavePos();

        return module.getRaw();
    }

    _getContext() {
        let current = [ ];

        const target  = this._target.peek();
        const indices = target.getFullPos();
        let   ptr     = target.getRaw();
        
        // Note: indices are the indices of how the JSON database is structured at a low level.
        // For instance, the coordinates of the first module under the root module would normally be ['tree'][0].
        // Since it's 2 indices ('tree' and 0) from the perspective of the parent module, we need to make 2 jumps each time.
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

    _isTag(obj) {
        return (typeof obj === 'string');
    }

    _matchingTag(answers, test, tested, lvl) {
        switch (test) {
            case '*': // from @any
                answers.value = true;
                break;
            case '~': // from @root
                answers.value = lvl === 0;
                break;
            case '%': // from @leaf
                answers.value = isEmpty(this._target.peek().enterGetAndLeave([alias.nested]));
                break;
            case '?': // from @random
                answers.value = (Math.random() >= 0.5);
                break;
            default: // assumed to be a regular old tag
                answers.value = false;
                for (const tag of tested[lvl]) {
                    if (test == tag) {
                        answers.value = true;
                        break;
                    }
                }
                break;
        }

        /**
         * Important line here: We want to verify, in addition to if an expression matches, that the expression also reaches the last element of the current module's context.
         * If whether it reaches the last element or not isn't verified, then the expression becomes true for the module, but also all of its sub-modules.
         * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
         * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
         * Thus, we need to see that there would not be additional levels of nesting left unverified for the current context before the expression is assumed correct.
         * The value is computed similarly to the expression's answer itself, and only combined at the very end.
         * That's because, for some sub-expressions (like the operand on the parent side of @child), the value of it isn't important or used.
         * Likewise, it shouldn't be mixed in with the actual answer yet, if it ever does get mixed in.
         */
        answers.ended = lvl === (tested.length - 1);
    }

    _testNot(answers, a, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        answers.value = !a_answers.value;
        answers.ended = a_answers.ended;
    }

    _testAnd(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);
        
        const b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            this._matchingExpression(b_answers, b, tested, lvl);
        }

        answers.value = a_answers.value && b_answers.value;
        answers.ended = a_answers.ended && b_answers.ended;
    }

    _testXor(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        this._matchingExpression(b_answers, b, tested, lvl);

        answers.value = (!a_answers.value && b_answers.value) || (a_answers.value && !b_answers.value);
        answers.ended = a_answers.value ? a_answers.ended : b_answers.ended;
    }

    _testOr(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        if ((a_answers.value === false) || (a_answers.ended === false)) {
            this._matchingExpression(b_answers, b, tested, lvl);
        }

        answers.value = a_answers.value || b_answers.value;
        answers.ended = (a_answers.value && a_answers.ended) || (b_answers.value && b_answers.ended) || a_answers.ended || b_answers.ended;
        // The value of "ended" should generally correspond to the same value causing an expression to be true, and which one it is matters with @or.
        // Don't ask why this particular configuration seems to work...
    }

    _testParentMain(answers, b, tested, lvl, opts = { }) {
        opts.recurse = opts.recurse ?? false;

        const target = this._target.peek();
        target.enterPos(alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosEmpty()) {
                tested = this._getContext();
                this._matchingExpression(answers, b, tested, lvl);
                if (opts.recurse && (answers.value === false)) {
                    this._testParentMain(answers, b, tested, lvl + 1, opts);
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

    _testParent(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            this._testParentMain(b_answers, b, tested, lvl + 1, { recurse: false });
        }

        answers.value = a_answers.value && b_answers.value;
        answers.ended = a_answers.ended; // We're only affecting the parent module.
    }

    _testAscend(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            this._testParentMain(b_answers, b, tested, lvl + 1, { recurse: true });
        }

        answers.value = a_answers.value && b_answers.value;
        answers.ended = a_answers.ended; // We're only affecting the parent module.
    }

    _testChild(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            this._matchingExpression(b_answers, b, tested, lvl - 1);
        }

        answers.value = a_answers.value && b_answers.value;
        answers.ended = a_answers.ended; // We're only affecting the child module.
    }

    _testDescend(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            lvl--;
            while ((b_answers.value === false) && (lvl >= 0)) {
                this._matchingExpression(b_answers, b, tested, lvl);
                lvl--;
            }
        }

        answers.value = a_answers.value && b_answers.value;
        answers.ended = a_answers.ended; // We're only affecting the child module.
    }

    _testTo(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            this._matchingExpression(b_answers, b, tested, lvl + 1);
        }

        answers.value = a_answers.value && b_answers.value;
        answers.ended = b_answers.ended; // We're only affecting the child module, but it's to the right of the operator now.
    }

    _testToward(answers, a, b, tested, lvl) {
        const a_answers = { value: false, ended: true };
        this._matchingExpression(a_answers, a, tested, lvl);

        const b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            lvl++;
            while (((b_answers.value === false) || (b_answers.ended === false)) && (lvl < tested.length)) {
                this._matchingExpression(b_answers, b, tested, lvl);
                lvl++;
            }
        }

        answers.value = a_answers.value && b_answers.value;
        answers.ended = b_answers.ended; // We're only affecting the child module, but it's to the right of the operator now.
    }

    _matchingExpression(answers, test, tested, lvl) {
        if (isEmpty(test)) {
            answers.value = isEmpty(tested);
            answers.ended = answers.value;
        } else if (isEmpty(tested) || (lvl < 0) || (lvl >= tested.length)) {
            answers.value = false;
            answers.ended = true;
        } else if (this._isTag(test)) {
            this._matchingTag(answers, test, tested, lvl);
        } else {
            switch (test.op) {
                case '!':
                    this._testNot(answers, test.a, tested, lvl);
                    break;
                case '&':
                    this._testAnd(answers, test.a, test.b, tested, lvl);
                    break;
                case '^':
                    this._testXor(answers, test.a, test.b, tested, lvl);
                    break;
                case '|':
                    this._testOr(answers, test.a, test.b, tested, lvl);
                    break;
                case '>':
                    this._testParent(answers, test.a, test.b, tested, lvl);
                    break;
                case '>>':
                    this._testAscend(answers, test.a, test.b, tested, lvl);
                    break;
                case '<':
                    this._testChild(answers, test.a, test.b, tested, lvl);
                    break;
                case '<<':
                    this._testDescend(answers, test.a, test.b, tested, lvl);
                    break;
                case '/':
                    this._testTo(answers, test.a, test.b, tested, lvl);
                    break;
                case '//':
                    this._testToward(answers, test.a, test.b, tested, lvl);
                    break;
            }
        }
    }

    _uniqueCopy(template) {
        const copy = deepCopy(template);

        // A UUID needs to be unique for every copy of a module, even if generated in the same statement.
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

    _composeModule(command, opts = { }) {
        opts.template = opts.template ?? null;

        const target = this._target.peek();
        switch (command) {
            case 'edit':
                target.setPosValue(this._uniqueCopy(opts.template));
                break;
            case 'module':
                target.enterPutAndLeave([alias.nested], this._uniqueCopy(opts.template));
                break;
            case 'print':
                this._output.push(deepCopy(target.getPosValue()));
                break;
            case 'delete':
                const spliced = target.getTopPos();
                if (spliced === null) {
                    // this module is the root module.
                    target.setPosValue({ });
                } else if (spliced === 0) {
                    // this module is the last module in the parent's tree.
                    target.leavePos();
                    target.setPosValue(undefined);
                    this._nested_deleted = true;
                } else {
                    // this module is still one of many modules in the parent's tree.
                    target.leavePos();
                    target.getPosValue().splice(spliced, 1);
                    target.enterPos(spliced - 1);
                }
                break;
        }
    }

    // The purpose of this is strictly for optimizing very large trees.
    _getMaximumDepth(test) {
        if (isEmpty(test)) {
            return 0;
        } else if (this._isTag(test)) {
            return 1;
        } else {
            let a_depth = 0;
            if (test.a !== undefined) {
                a_depth = this._getMaximumDepth(test.a);
            }
            if (a_depth === null) {
                return a_depth;
            }
    
            let b_depth = 0;
            if (test.b !== undefined) {
                b_depth = this._getMaximumDepth(test.b);
            }
            if (b_depth === null) {
                return b_depth;
            }

            let depth = (a_depth > b_depth) ? a_depth : b_depth;
            if (test.op === '//') {
                return null;
            } else if (test.op === '/') {
                return depth + 1;
            } else {
                return depth;
            }
        }
    }

    _traverseModule(test, command, depth, max_depth, opts = { }) {
        opts.template = opts.template ?? null;
        opts.greedy   = opts.greedy ?? false;

        const answers = { value: false, ended: false };
        this._matchingExpression(answers, test, this._getContext(), 0);

        let   matched      = answers.value && answers.ended;
        const matched_this = matched;
        if (((max_depth === null) || (depth < max_depth)) && (!opts.greedy || !matched)) {
            const target = this._target.peek();
            target.enterPos(alias.nested);
            if (!target.isPosEmpty()) {
                target.enterPos(0);
                while (!target.isPosEmpty()) {
                    matched = this._traverseModule(test, command, depth + 1, max_depth, opts);
                    if ((opts.greedy && matched) || this._nested_deleted) {
                        break;
                    } else {
                        target.nextItem();
                    }
                }
                if (this._nested_deleted) {
                    this._nested_deleted = false;
                } else {
                    target.leavePos();
                }
            }
            target.leavePos();
        }

        if (matched_this) {
            this._composeModule(command, { template: opts.template });
        }

        return matched;
    }

    _isReadOp(command) {
        switch (command) {
            case 'print':
                return true;
            default:
                return false;
        }
    }

    _parseStatement() {
        const context    = this._astree.enterGetAndLeave(['context']);
        const expression = context ? context.expression : [ ];
        let greedy;
        if (context) {
            if (context.greedy === undefined) {
                // Why is greedy true if there's no expression? Because then only the root module is matched, and of course only one module *is* the root module.
                // It's just for optimization reasons.
                if (isEmpty(expression)) {
                    greedy = true;
                } else {
                    greedy = false;
                }
            } else {
                greedy = context.greedy;
            }
        }

        const command = this._astree.enterGetAndLeave(['operation']);

        let template;
        if (this._isReadOp(command)) {
            template = null;
        } else {
            template = this._createModule(command);
        }

        this._traverseModule(expression, command, 0, this._getMaximumDepth(expression), { template: template, greedy: greedy });
    }

    _parse() {
        this._astree.enterPos(alias.nested);
        if (!this._astree.isPosEmpty()) {
            this._astree.enterPos(0);
            while (!this._astree.isPosEmpty()) {
                this._parseStatement();
                if (this._nested_deleted) {
                    break;
                } else {
                    this._astree.nextItem();
                }
            }
            if (!this._nested_deleted) {
                this._astree.leavePos();
            }
        }
        this._astree.leavePos();
    }

    compose(input, opts = { }) {
        this._astree = input;
        this._output = [ ];
        this._parse();
        return this._output;
    }
}

export const composer = new Composer();
