export class Stack {
    constructor() {
        this._arr = [ ];
    }

    toArray() {
        return this._arr;
    }
    
    push(item) {
        this._arr.push(item);
    }
    
    pop() {
        if (this.isEmpty()) {
            throw new Error('Stack underflow');
        }
        return this._arr.pop();
    }

    length() {
        return this._arr.length;
    }

    isEmpty() {
        return this._arr.length == 0;
    }
    
    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this._arr[this._arr.length - 1];
    }
    
    clear() {
        this._arr = [ ];
    }
}
