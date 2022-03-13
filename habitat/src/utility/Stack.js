export class Stack {
    constructor() {
        this.arr = [ ];
    }

    toArray() {
        return this.arr;
    }
    
    push(item) {
        this.arr.push(item);
    }
    
    pop() {
        if (this.isEmpty()) {
            throw new Error('Stack underflow');
        }
        return this.arr.pop();
    }

    isEmpty() {
        return this.arr.length == 0;
    }
    
    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this.arr[this.arr.length - 1];
    }
    
    clear() {
        this.arr = [ ];
    }
}
