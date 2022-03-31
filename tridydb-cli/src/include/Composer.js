import { StateTree } from './StateTree.js';

import { alias, deepCopy, isEmpty } from '../utility/common.js';
import { Stack }                    from '../utility/Stack.js';

class Composer {
    astree  = null;
    target  = new Stack();
    context = null;
    output  = [ ];

    constructor() {
        this.target.push(new StateTree());
    }

    load(tree) {
        this.astree = tree;
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
            if (ptr[alias.tags]) {
                current.push(ptr[alias.tags]);
            } else {
                current.push([ ]);
            }
        }

        return current;
    }

    isTag(obj) {
        return (typeof obj == 'string');
    }

    matchingTag(test, lvl) {
        switch (test) {
            case '@any':
                return true;
            default:
                if (!isEmpty(this.context[lvl])) {
                    for (const tag of this.context[lvl]) {
                        if (test == tag) {
                            return true;
                        }
                    }
                }
                return false;
        }
    }

    testNot(a, lvl) {
        a = this.matchingExpression(a, lvl);

        return !a;
    }

    testAnd(a, b, lvl) {
        a = this.matchingExpression(a, lvl);
        b = this.matchingExpression(b, lvl);

        return a && b;
    }

    testXor(a, b, lvl) {
        a = this.matchingExpression(a, lvl);
        b = this.matchingExpression(b, lvl);

        return (!a && b) || (a && !b);
    }

    testOr(a, b, lvl) {
        a = this.matchingExpression(a, lvl);
        b = this.matchingExpression(b, lvl);

        return a || b;
    }

    testTo(a, b, lvl) {
        a = this.matchingExpression(a, lvl);

        let r = false;
        lvl++;
        if (lvl < this.context.length) {
            if (this.isTag(b)) {
                if (lvl === this.context.length - 1) {
                    r = this.matchingTag(b, lvl);
                }
            } else {
                r = this.matchingExpression(b, lvl);
            }
        }
        b = r;

        return a && b;
    }

    testToward(a, b, lvl) {
        a = this.matchingExpression(a, lvl);

        let r = false;
        lvl++;
        while ((r === false) && (lvl < this.context.length)) {
            if (this.isTag(b)) {
                if (lvl === this.context.length - 1) {
                    r = this.matchingTag(b, lvl);
                }
            } else {
                r = this.matchingExpression(b, lvl);
            }
            lvl++;
        }
        b = r;

        return a && b;
    }

    matchingExpression(test, lvl) {
        if (isEmpty(this.context)) {
            return false;
        } else if (this.isTag(test)) {
            return this.matchingTag(test, lvl);
        } else {
            switch (test.op) {
                case '!':
                    return this.testNot(test.a, lvl);
                case '&':
                    return this.testAnd(test.a, test.b, lvl);
                case '^':
                    return this.testXor(test.a, test.b, lvl);
                case '|':
                    return this.testOr(test.a, test.b, lvl);
                case '>':
                    return this.testTo(test.a, test.b, lvl);
                case '>>':
                    return this.testToward(test.a, test.b, lvl);
            }
        }
    }

    matchingContext(test) {
        if (isEmpty(test)) {
            return true;
        } else {
            this.context = this.getContext();

            return this.matchingExpression(test, 0);
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
                    target.setPosValue([ ]);
                    target.enterPos(0);
                } else {
                    target.leavePos();
                    target.getPosValue().splice(spliced, 1);
                    target.enterPos(spliced - 1);
                }
                break;
        }
    }

    traverseModule(test, command, template = null) {
        const matched = this.matchingContext(test);

        const target = this.target.peek();
        if (!matched) {
            target.enterPos(alias.nested);
            if (!target.isPosEmpty()) {
                target.enterPos(0);
                while (!target.isPosEmpty()) {
                    this.traverseModule(test, command, template);
                    target.nextItem();
                }
                target.leavePos();
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
                this.astree.nextItem();
            }
            this.astree.leavePos();
        }
        this.astree.leavePos();
    }

    compose() {
        this.output = [ ];
        this.parse();
        return this.output;
    }
}

export const composer = new Composer();
