export class Queue {
    constructor() {
        this.arr = [ ];
    }

    toArray() {
        return this.arr;
    }
    
    enqueue(item) {
        this.arr.push(item);
    }
    
    dequeue() {
        if (this.isEmpty()) {
            throw new Error('Queue underflow');
        }
        return this.arr.shift();
    }

    isEmpty() {
        return this.arr.length == 0;
    }
    
    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this.arr[0];
    }
    
    clear() {
        this.arr = [ ];
    }
}
