import { Stack } from '../../utility/Stack.js';
import { Queue } from '../../utility/Queue.js';
import { errorHandler } from '../../utility/error.js';

class InfixParser {
    constructor() { }

    load(input) {
        this.input = input;
    }

    parse() {
        const toPostfix = () => {
            const prec = {
                '!': 0,
                '&': 1,
                '|': 2,
                '.': 3,
                ':': 4
            }
    
            const out = new Queue();
            const ops = new Stack();
    
            for (const token of this.input) {
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
        
        const toTree = (postfix) => {
            const isUnaryOp = (token) => {
                return (token.val == '!');
            }

            const out = new Stack();

            let current;
            while (!postfix.isEmpty()) {
                current = postfix.dequeue();
                if (current.type == 't') {
                    out.push(current.val);
                } else if (isUnaryOp(current)) {
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

        return toTree(toPostfix());

        //return out.toArray();
    }
}

export const parser = new InfixParser();
