import { Stack } from '../../utility/Stack.js';
import { Queue } from '../../utility/Queue.js';

class InfixParser {
    constructor() { }

    load(input) {
        this.input = input;
    }

    parse() {
        const prec = {
            '!': 0,
            '&': 1,
            '|': 2,
            '.': 3,
            ':': 4
        }

        const ops = new Stack();
        const out = new Queue();

        for (let token of this.input) {
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

        return out.toArray();
    }
}

export const parser = new InfixParser();
