import { StateTree } from './StateTree.js';
import { deepCopy }  from '../../utility/common.js';
import { Stack }     from '../../utility/Stack.js';

class Compositor {
    constructor() { }

    isLoaded() {
        return (this.machines !== undefined);
    }

    loadInit(tree = null) {
        if (tree) {
            this.machines = new StateTree(tree);
        } else {
            this.machines = new StateTree();
        }
    }

    loadCommands(tree) {
        this.astree = tree;
    }

    parse() {
        const parseStatement = () => {
            const createMachine = () => {
                const transactValue = (source, shared, target) => {
                    source.enterPos(shared);
                    target.enterPos(shared);
                    target.setPosValue(source.getPosValue());
                    target.leavePos();
                    source.leavePos();
                }
    
                const machine = new StateTree();
    
                this.astree.enterPos('definition');
                if (!this.astree.isPosEmpty()) {
                    this.astree.enterPos('stack');
                    if (!this.astree.isPosEmpty()) {
                        const nested = this.parse();
    
                        machine.enterPos('stack');
                        machine.setPosValue(nested);
                        machine.leavePos();
                    }
                    this.astree.leavePos();
    
                    transactValue(this.astree, 'heap', machine);
                    transactValue(this.astree, 'tags', machine);
                    transactValue(this.astree, 'sys', machine);
                    transactValue(this.astree, 'final', machine);

                    machine.enterPos('build');
                    switch (command) {
                        case 'now':
                            machine.setPosValue(0);
                            break;
                        case 'new':
                            machine.setPosValue(1);
                            break;
                    }
                    machine.leavePos();
                }
                this.astree.leavePos();
    
                return machine.getRaw();
            }

            const createComposited = () => {
                const traverseMachines = () => {
                    const matchingContext = () => {
                        const getContext = () => {
                            let current = [ ];
    
                            const indices = this.machines.getFullPos();
                            let   ptr     = this.machines.getRaw();
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
    
                        const isSolved = (operand) => {
                            return (typeof operand == 'boolean');
                        }

                        /*
                        const solve = (operand) => {
                            for (const tag of context[level]) {
                                if (operand == tag) {
                                    return true;
                                }
                            }
                            return false;
                        }

                        const testNot = () => {
                            let a = operands.pop();

                            a = isSolved(a) ? a : solve(a);
    
                            operands.push(!a);
                        }
    
                        const testAnd = () => {
                            let b = operands.pop();
                            let a = operands.pop();
    
                            a = isSolved(a) ? a : solve(a);
                            b = isSolved(b) ? b : solve(b);
    
                            operands.push(a && b);
                        }
    
                        const testOr = () => {
                            let b = operands.pop();
                            let a = operands.pop();
    
                            a = isSolved(a) ? a : solve(a);
                            b = isSolved(b) ? b : solve(b);
    
                            operands.push(a || b);
                        }
    
                        const testTo = () => {
                            let b = operands.pop();
                            let a = operands.pop();
    
                            b = isSolved(b) ? b : solve(b);
                            if (level > 0) {
                                level--;

                                a = isSolved(a) ? a : solve(a);
                            } else {
                                a = false;
                            }

                            a = isSolved(a) ? a : solve(a);
                            if (level > 0) {
                                level--;

                                b = isSolved(b) ? b : solve(b);
                            } else {
                                a = false;
                            }
    
                            operands.push(a && b);
                        }
    
                        const testInto = () => {
                            let b = operands.pop();
                            let a = operands.pop();
    
                            b = isSolved(b) ? b : solve(b);
                            while (level > 0) {
                                level--;
    
                                let temp = a;
                                temp = isSolved(a) ? a : solve(a);
                                if (temp) {
                                    a = true;
                                    break;
                                }
                            }

                            if (!isSolved(a)) {
                                a = false;
                            }
    
                            operands.push(a && b);
                        }

                        const isRoot = () => {
                            return (level === 0);
                        }

                        const testRoot = () => {
                            let a = operands.pop();
                            a = isSolved(a) ? a : solve(a);
                            a = isRoot() ? a : false;
                            operands.push(a);
                        }
    
                        const pushLevel = () => {
                            levels.push(level);
                        }
    
                        const popLevel = () => {
                            level = levels.pop();
                        }
                        
                        const context = getContext();
    
                        const operands = new Stack();
    
                        const levels = new Stack();
                        let   level  = 0;
    
                        if (expression) {
                            for (const token of expression) {
                                if (token.type == 't') {
                                    operands.push(token.val);
                                } else {
                                    switch (token.val) {
                                        case '!':
                                            testNot();
                                            break;
                                        case '&':
                                            testAnd();
                                            break;
                                        case '|':
                                            testOr();
                                            break;
                                        case '.':
                                            testTo();
                                            break;
                                        case ':':
                                            testInto();
                                            break;
                                        case '(':
                                            pushLevel();
                                            break;
                                        case ')':
                                            popLevel();
                                            break;
                                    }
                                }
                            }
                            testRoot();

                            let final = operands.pop();
                            final = isSolved(final) ? final : solve(final);

                            return final;
                        } else {
                            return isRoot();
                        }
                        */
                    }
    
                    const isFinal = () => {
                        let final;
    
                        this.machines.enterPos('final');
                        final = (!this.machines.isPosEmpty() && this.machines.getPosValue() === true)
                        this.machines.leavePos();
    
                        return final;
                    }
    
                    const composeMachine = () => {
                        switch (command) {
                            case 'buildtime':
                            case 'runtime':
                                this.machines.putPosValue(deepCopy(template));
                            
                                return null;
                            case 'finalize':
                                this.machines.enterPos('final');
                                this.machines.setPosValue(true);
                                this.machines.leavePos();
    
                                return null;
                            case 'print':
                                return deepCopy(this.machines.getPosValue());
                        }
                    }
    
                    const total_output = [ ];
                    let   machine_output;
                    let   stack_output;

                    this.machines.enterPos(0);
                    while (!this.machines.isPosEmpty()) {
                        this.machines.enterPos('stack');
                        if (!this.machines.isPosEmpty()) {
                            stack_output = traverseMachines();

                            for (const submach of stack_output) {
                                total_output.push(submach);
                            }
                        }
                        this.machines.leavePos();
    
                        if (!isFinal() && matchingContext()) {
                            machine_output = composeMachine();

                            total_output.push(machine_output);
                        }
    
                        this.machines.nextItem();
                    }
                    this.machines.leavePos();

                    return total_output;
                }
    
                this.astree.enterPos('context');
                const expression = this.astree.getPosValue();
                this.astree.leavePos();
    
                this.machines.enterPos('stack');
                const output = traverseMachines();
                this.machines.leavePos();

                return output;
            }

            this.astree.enterPos('operation');
            const command = this.astree.getPosValue();
            this.astree.leavePos();
            
            const template = createMachine();
            
            return createComposited();
        }

        const total_output = [ ];
        let   stmt_output;

        this.astree.enterPos('stack');
        this.astree.enterPos(0);
        while (!this.astree.isPosEmpty()) {
            stmt_output = parseStatement();

            for (const mach of stmt_output) {
                total_output.push(mach);
            }

            this.astree.nextItem();
        }
        this.astree.leavePos();
        this.astree.leavePos();

        return total_output;
    }
}

export const compositor = new Compositor();
