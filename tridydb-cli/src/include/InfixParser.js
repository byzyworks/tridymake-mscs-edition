import { Stack } from '../utility/Stack.js';
import { Queue } from '../utility/Queue.js';

class InfixParser {
    constructor() { }

    toPostfix(input) {
        const prec = {
            '!': 0,
            '&': 1,
            '^': 2,
            '|': 3,
            '<': 4,
            '<<': 5,
            '>': 6,
            '>>': 7
        }

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
    
    toTree(postfix) {
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
        return this.toTree(this.toPostfix(input));

        //return out.toArray();
    }
}

export const parser = new InfixParser();
