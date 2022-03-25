import { StateTree }         from './StateTree.js';
import { deepCopy, isEmpty } from '../../utility/common.js';
import { Stack }             from '../../utility/Stack.js';

class Compositor {
    astree    = null;
    machines  = null;
    target    = new Stack();
    context   = null;
    match_all = false;
    output    = [ ];

    constructor() { }

    isLoaded() {
        return (this.machines ? true : false);
    }

    loadInit(tree = null) {
        if (tree) {
            this.machines = new StateTree(tree);
        } else {
            this.machines = new StateTree();
        }
        this.target.push(this.machines);
    }

    loadCommands(tree) {
        this.astree = tree;
    }

    createMachine(command) {
        const transactValue = (source, shared, target) => {
            source.enterPos(shared);
            target.enterPos(shared);
            if (!source.isPosEmpty()) {
                target.setPosValue(source.getPosValue());
            }
            target.leavePos();
            source.leavePos();
        }

        const machine = new StateTree();

        this.astree.enterPos('definition');
        if (!this.astree.isPosEmpty()) {
            this.astree.enterPos('stack');
            if (!this.astree.isPosEmpty()) {
                this.astree.leavePos();

                this.target.push(machine);
                const stack = this.parse().stack;
                this.target.pop();

                if (!isEmpty(stack)) {
                    machine.enterPos('stack');
                    machine.setPosValue(stack);
                    machine.leavePos();
                }
            } else {
                this.astree.leavePos();
            }

            transactValue(this.astree, 'heap', machine);
            transactValue(this.astree, 'tags', machine);
            transactValue(this.astree, 'sys', machine);
            transactValue(this.astree, 'final', machine);

            machine.enterPos('build');
            switch (command) {
                case 'buildtime':
                    machine.setPosValue(0);
                    break;
                case 'runtime':
                    machine.setPosValue(1);
                    break;
            }
            machine.leavePos();
        }
        this.astree.leavePos();

        return machine.getRaw();
    }

    getContext() {
        let current = [ ];

        const target  = this.target.peek();
        const indices = target.getFullPos();
        let   ptr     = target.getRaw();
        
        for (let i = 0; i < indices.length; i += 2) {
            ptr = ptr[indices[i]][indices[i + 1]];
            if (ptr.tags) {
                current.push(ptr.tags);
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
        if (this.match_all) {
            return true;
        }

        switch (test) {
            case '@any':
                return true;
            case '@all':
                this.match_all = true;

                return true;
            case '@leaf':
                const target = this.target.peek();

                target.enterPos('stack');
                const leaf = isEmpty(target.getPosValue());
                target.leavePos();

                return leaf;
            default:
                for (const tag of this.context[lvl]) {
                    if (test == tag) {
                        return true;
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

    testInto(a, b, lvl) {
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
                case '|':
                    return this.testOr(test.a, test.b, lvl);
                case '.':
                    return this.testTo(test.a, test.b, lvl);
                case ':':
                    return this.testInto(test.a, test.b, lvl);
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

    composeMachine(command, template = null) {
        const target = this.target.peek();
        switch (command) {
            case 'buildtime':
            case 'runtime':
                target.enterPos('stack');
                target.putPosValue(deepCopy(template));
                target.leavePos();
                break;
            case 'clear':
                target.setPosValue({ });
                break;
            case 'lock':
                target.enterPos('final');
                target.setPosValue(true);
                target.leavePos();
                break;
        }

        const result = deepCopy(target.getPosValue());
        if (this.isReadOp(command)) {
            this.output.push(result);
            return null;
        } else {
            return result;
        }
    }

    isFinal() {
        const target = this.target.peek();

        target.enterPos('final');
        const test = target.getPosValue() ?? false;
        target.leavePos();

        return test;
    }

    traverseMachine(test, command, template = null) {
        const total_output = [ ];
        let   machine_output;
        let   stack_output;

        this.match_all = false;

        let matched;
        if (this.isFinal() && !this.isReadOp(command)) {
            matched = false;
        } else {
            matched = this.matchingContext(test);
        }

        if (matched) {
            machine_output = this.composeMachine(command, template);

            if (machine_output) {
                total_output.push(machine_output);
            }
        }
        
        const target = this.target.peek();
        if (!matched || this.match_all) {
            target.enterPos('stack');
            if (!target.isPosEmpty()) {
                target.enterPos(0);
                while (!target.isPosEmpty()) {
                    stack_output = this.traverseMachine(test, command, template);

                    for (const submach of stack_output) {
                        total_output.push(submach);
                    }

                    target.nextItem();
                }
                target.leavePos();
            }
            target.leavePos();
        }

        return total_output;
    }

    createComposited(command, template = null) {
        this.astree.enterPos('context');
        const test = this.astree.getPosValue();
        this.astree.leavePos();

        const output = this.traverseMachine(test, command, template);

        return output;
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
        this.astree.enterPos('operation');
        const command = this.astree.getPosValue();
        this.astree.leavePos();
        
        let template;
        if (this.isReadOp(command)) {
            template = null;
        } else {
            template = this.createMachine(command);
        }
        
        return this.createComposited(command, template);
    }

    parse() {
        const total_output = [ ];
        let   stmt_output;

        this.astree.enterPos('stack');
        if (!this.astree.isPosEmpty()) {
            this.astree.enterPos(0);
            while (!this.astree.isPosEmpty()) {
                stmt_output = this.parseStatement();
    
                for (const mach of stmt_output) {
                    total_output.push(mach);
                }
    
                this.astree.nextItem();
            }
            this.astree.leavePos();
        }
        this.astree.leavePos();

        return total_output;
    }

    compose() {
        this.output = [ ];
        this.parse();
        return this.output;
    }
}

export const compositor = new Compositor();
