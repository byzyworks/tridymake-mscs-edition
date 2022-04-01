import { StateTree } from './StateTree.js';

import { alias, deepCopy, isEmpty } from '../utility/common.js';
import { Stack }                    from '../utility/Stack.js';

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
            this.astree.enterCopyAndLeave(module, [alias.handle]);

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

    matchingTag(test, tested, lvl) {
        switch (test) {
            case '@any':
                return true;
            default:
                if (!isEmpty(tested[lvl])) {
                    for (const tag of tested[lvl]) {
                        if (test == tag) {
                            return true;
                        }
                    }
                }
                return false;
        }
    }

    testNot(a, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);

        return !a;
    }

    testAnd(a, b, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);
        b = this.matchingExpression(b, tested, lvl);

        return a && b;
    }

    testXor(a, b, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);
        b = this.matchingExpression(b, tested, lvl);

        return (!a && b) || (a && !b);
    }

    testOr(a, b, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);
        b = this.matchingExpression(b, tested, lvl);

        return a || b;
    }

    testTo(a, b, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);

        let r = false;
        lvl++;
        if (lvl < tested.length) {
            if (this.isTag(b)) {
                if (lvl === tested.length - 1) {
                    r = this.matchingTag(b, tested, lvl);
                }
            } else {
                r = this.matchingExpression(b, tested, lvl);
            }
        }
        b = r;

        return a && b;
    }

    testToward(a, b, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);

        let r = false;
        lvl++;
        while ((r === false) && (lvl < tested.length)) {
            if (this.isTag(b)) {
                if (lvl === tested.length - 1) {
                    r = this.matchingTag(b, tested, lvl);
                }
            } else {
                r = this.matchingExpression(b, tested, lvl);
            }
            lvl++;
        }
        b = r;

        return a && b;
    }

    testParent(a, b, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);

        lvl++;

        let r = false;

        const target = this.target.peek();
        target.enterPos(alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosEmpty()) {
                r = this.matchingExpression(b, this.getContext(), lvl);
                if (r === true) {
                    break;
                }

                target.nextItem();
            }
            target.leavePos();
        }
        target.leavePos();

        b = r;

        return a && b;
    }

    testAscend(a, b, tested, lvl) {
        a = this.matchingExpression(a, tested, lvl);

        lvl++;

        let r = false;

        const target = this.target.peek();
        target.enterPos(alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosEmpty()) {
                tested = this.getContext();
                r = this.matchingExpression(b, tested, lvl);
                if (r === false) {
                    r = this.testAscend(a, b, tested, lvl);
                }
                if (r === true) {
                    break;
                }

                target.nextItem();
            }
            target.leavePos();
        }
        target.leavePos();

        b = r;

        return a && b;
    }

    matchingExpression(test, tested, lvl) {
        if (isEmpty(tested)) {
            return false;
        } else if (typeof test === 'boolean') {
            return test;
        } else if (this.isTag(test)) {
            return this.matchingTag(test, tested, lvl);
        } else {
            switch (test.op) {
                case '!':
                    return this.testNot(test.a, tested, lvl);
                case '&':
                    return this.testAnd(test.a, test.b, tested, lvl);
                case '^':
                    return this.testXor(test.a, test.b, tested, lvl);
                case '|':
                    return this.testOr(test.a, test.b, tested, lvl);
                case '>':
                    return this.testTo(test.a, test.b, tested, lvl);
                case '>>':
                    return this.testToward(test.a, test.b, tested, lvl);
                case '<':
                    return this.testParent(test.a, test.b, tested, lvl);
                case '<<':
                    return this.testAscend(test.a, test.b, tested, lvl);
            }
        }
    }

    composeModule(command, template = null) {
        const target = this.target.peek();
        switch (command) {
            case 'edit':
                target.setPosValue(deepCopy(template));
                break;
            case 'module':
                target.enterPutAndLeave([alias.nested], deepCopy(template));
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

    traverseModule(test, command, template = null) {
        let matched;
        if (isEmpty(test)) {
            matched = true;
        } else {
            matched = this.matchingExpression(test, this.getContext(), 0);
        }

        if (!matched) {
            const target = this.target.peek();
            target.enterPos(alias.nested);
            if (!target.isPosEmpty()) {
                target.enterPos(0);
                while (!target.isPosEmpty()) {
                    this.traverseModule(test, command, template);
                    if (this.nested_deleted) {
                        break;
                    } else {
                        target.nextItem();
                    }
                }
                if (!this.nested_deleted) {
                    target.leavePos();
                }
            }
            target.leavePos();
        }

        if (matched) {
            this.composeModule(command, template);
        }
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
        const test    = this.astree.enterGetAndLeave(['context']);
        const command = this.astree.enterGetAndLeave(['operation']);
        let template;
        if (this.isReadOp(command)) {
            template = null;
        } else {
            template = this.createModule(command);
        }

        this.traverseModule(test, command, template);
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
