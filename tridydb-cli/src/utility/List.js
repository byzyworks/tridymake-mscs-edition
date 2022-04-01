import { Stack } from './Stack.js';

export class List extends Stack {
    constructor() {
        super();

        this.it = 0;
    }

    prev() {
        if (this.it > 0) {
            this.it--;

            if (this.it >= 0) {
                return this.arr[this.it];
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    next() {
        if (this.it < this.arr.length) {
            this.it++;

            if (this.it < this.arr.length) {
                return this.arr[this.it];
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    peek() {
        return this.arr[this.it];
    }

    isEnd() {
        return this.it >= this.arr.length;
    }
}
