export class Queue {
    constructor(preset = null) {
        this._arr = preset ?? [ ];
    }

    toArray() {
        return this._arr;
    }
    
    enqueue(item) {
        this._arr.push(item);
    }
    
    dequeue() {
        if (this.isEmpty()) {
            throw new Error('Queue underflow');
        }
        return this._arr.shift();
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
        return this._arr[0];
    }
    
    clear() {
        this._arr = [ ];
    }
}
