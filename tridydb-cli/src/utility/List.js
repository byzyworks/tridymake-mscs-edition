import { Stack } from './Stack.js';

export class List extends Stack {
    constructor() {
        super();

        this._it = 0;
    }

    prev() {
        if (this._it > 0) {
            this._it--;

            if (this._it >= 0) {
                return this._arr[this._it];
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    next() {
        if (this._it < this._arr.length) {
            this._it++;

            if (this._it < this._arr.length) {
                return this._arr[this._it];
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    peek() {
        return this._arr[this._it];
    }

    isEnd() {
        return this._it >= this._arr.length;
    }
}
