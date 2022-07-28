import { isDictionary, isEmpty } from '../utility/common.js';
import { Stack }                 from '../utility/Stack.js';
import { Queue }                 from '../utility/Queue.js';
import { Token }                 from '../utility/Token.js';

export class ContextParser {
    constructor() { }

    /**
     * This method is designed according to the Shunting-Yard algorithm for converting infix expressions to postfix. Refer to it better understand the algorithm below.
     * Postfix is much easier to parse algorithmically since operands can be grabbed at will from a stack when an operator is encountered, and don't need to be parsed out-of-order.
     * (In other words, no need for parentheses).
     */
    static _toPostfix(input) {
        const prec = {
            '$==': 0,
            '$!=': 0,
            '$<':  0,
            '$<=': 0,
            '$>':  0,
            '$>=': 0,
            '!':   1,
            '&':   2,
            '^':   3,
            '|':   4,
            '?':   5,
            ':':   5,
            '<':   6,
            '<<':  6,
            '>':   6,
            '>>':  6,
            '/':   7,
            '//':  7
        }

        const out = new Queue();
        const ops = new Stack();

        for (const token of input) {
            if ((token.type === 'ctxt_term') || (token.type === 'ctxt_func')) {
                out.enqueue(token);
            } else if (token.val === '(') {
                ops.push(token);
            } else if (token.val === ')') {
                while (!ops.isEmpty() && (ops.peek().val !== '(')) {
                    out.enqueue(ops.pop());
                }
                ops.pop();
            } else if (token.type === 'ctxt_op') {
                while (!ops.isEmpty() && (ops.peek().val !== '(') && (prec[ops.peek().val] < prec[token.val])) {
                    out.enqueue(ops.pop());
                }
                ops.push(token);
            }
        }

        while (!ops.isEmpty()) {
            out.enqueue(ops.pop());
        }

        return out;
    }
    
    /**
     * The now-postfix expression is converted to a tree afterwards.
     * This is done for the composer's sake, which tests the expressions contained in the tree recursively.
     * Having the composer use the postfix array directly was the original intention.
     * This idea was scrapped because the operator type in Tridy can change how a sub-expression is to be evaluated.
     * '@to' and '@toward' notably force the second operand to be evaluated at a nesting level above the current one.
     * The postfix array makes this difficult because the operator isn't reached until both operands are already evaluated and reduced into booleans.
     * Having a tree gives much greater flexibility over when and how to evaluate operands (and is easier to read).
     */
    static _toTree(postfix) {
        const out = new Stack();

        while (!postfix.isEmpty()) {
            let current = postfix.dequeue();
            if (current.type === 'ctxt_term') {
                out.push(current.val);
            } else if (current.type === 'ctxt_func') {
                out.push({ function: current.val });
            } else if (current.isUnaryOpContextToken()) {
                const a = out.pop();

                out.push({ a: a, op: current.val });
            } else if (current.isBinaryOpContextToken()) {
                const b = out.pop();
                const a = out.pop();

                out.push({ a: a, op: current.val, b: b });
            } else if (current.isTernarySecondOpContextToken()) {
                const op = postfix.dequeue().val; // Removes the question mark (already syntax-checked)

                const c = out.pop();
                const b = out.pop();
                const a = out.pop();

                out.push({ a: a, op: op, b: b, c: c });
            }
        }

        return out.pop();
    }

    static parse(input) {
        return this._toTree(this._toPostfix(input));
    }

    /**
     * Adding "position helpers" to the expression's terminals is to determine which sub-expressions are "intermediate" (like a in "a/b") of "final" (like b in "a/b").
     * We want to verify, in addition to if an expression matches, that the expression also reaches the last element of the current module's context.
     * If whether it reaches the last element or not isn't verified, then the expression becomes true not only for the module, but also all of its sub-modules.
     * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
     * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
     * Fortunately, it's easy from the expression to determine if a terminal is final or not, based on it containing sub-expressions with transitive operators.
     * It can be made a requirement specifically that "final" terminals are evaluated at a last level of the context being evaluated, and not before or after.
     */
    static _createPositionHelpers(test, end = null) {
        const token = new Token('ctxt_op', test.op);

        if (end === null) {
            if (token.isNestedOpContextToken()) {
                let evaluated = 'a';
                let affected  = 'b';
                if (token.isNonTransitiveNestedOpContextToken()) {
                    evaluated = 'b';
                    affected  = 'a';
                }
    
                if (isDictionary(test[evaluated])) {
                    this._createPositionHelpers(test[evaluated], false);
                } else {
                    test[evaluated] = { val: test[evaluated], end: false };
                }

                if (isDictionary(test[affected])) {
                    this._createPositionHelpers(test[affected], null);
                } else {
                    test[affected] = { val: test[affected], end: true };
                }
            } else {
                if (isDictionary(test.a)) {
                    this._createPositionHelpers(test.a, null);
                } else {
                    test.a = { val: test.a, end: true };
                }

                if (!token.isUnaryOpContextToken()) {
                    if (isDictionary(test.b)) {
                        this._createPositionHelpers(test.b, null);
                    } else {
                        test.b = { val: test.b, end: true };
                    }

                    if (token.isTernaryFirstOpContextToken()) {
                        if (isDictionary(test.c)) {
                            this._createPositionHelpers(test.c, null);
                        } else {
                            test.c = { val: test.c, end: true };
                        }
                    }
                }
            }
        } else {
            if (isDictionary(test.a)) {
                this._createPositionHelpers(test.a, end);
            } else {
                test.a = { val: test.a, end: end };
            }
            
            if (!token.isUnaryOpContextToken()) {
                if (isDictionary(test.b)) {
                    this._createPositionHelpers(test.b, end);
                } else {
                    test.b = { val: test.b, end: end };
                }

                if (token.isTernaryFirstOpContextToken()) {
                    if (isDictionary(test.c)) {
                        this._createPositionHelpers(test.c, end);
                    } else {
                        test.c = { val: test.c, end: end };
                    }
                }
            }
        }
    }

    static upgrade(test) {
        if (!isDictionary(test)) {
            return { val: test, end: true };
        }

        if (!isEmpty(test)) {
            this._createPositionHelpers(test, null);
        }

        return test;
    }
}
