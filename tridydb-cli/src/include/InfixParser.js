import { Stack } from '../utility/Stack.js';
import { Queue } from '../utility/Queue.js';

export class InfixParser {
    constructor() { }

    /**
     * This method is designed according to the Shunting-Yard algorithm for converting infix expressions to postfix. Refer to it better understand the algorithm below.
     * Postfix is much easier to parse algorithmically since operands can be grabbed at will from a stack when an operator is encountered, and don't need to be parsed out-of-order.
     * (In other words, no need for parentheses).
     */
    _toPostfix(input) {
        const prec = {
            '!':  0,
            '&':  1,
            '^':  2,
            '|':  3,
            '<':  4,
            '<<': 4,
            '>':  4,
            '>>': 4,
            '/':  5,
            '//': 5
        };

        const out = new Queue();
        const ops = new Stack();

        for (const token of input) {
            if (token.type == 't') {
                out.enqueue(token);
            } else if (token.val == '(') {
                ops.push(token);
            } else if (token.val == ')') {
                while (!ops.isEmpty() && (ops.peek().val != '(')) {
                    out.enqueue(ops.pop());
                }
                ops.pop();
            } else {
                // token is operator that isn't parantheses
                while (!ops.isEmpty() && (prec[ops.peek().val] < prec[token.val])) {
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
    _toTree(postfix) {
        const out = new Stack();

        let current;
        while (!postfix.isEmpty()) {
            current = postfix.dequeue();
            if (current.type == 't') {
                out.push(current.val);
            } else if (current.isUnaryOpContextToken()) {
                const a = out.pop();

                out.push({ a: a, op: current.val });
            } else {
                const b = out.pop();
                const a = out.pop();

                out.push({ a: a, op: current.val, b: b });
            }
        }

        return out.pop();
    }

    parse(input) {
        return this._toTree(this._toPostfix(input));
    }
}
