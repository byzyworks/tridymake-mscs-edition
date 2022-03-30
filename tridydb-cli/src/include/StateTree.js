export class StateTree {
    pos  = [ ];
    tree = null;
    ptr  = null;
    changed_pos = true;

    constructor(imported = null) {
        if (imported) {
            this.tree = imported;
        } else {
            this.tree = { };
        }

        this.ptr = this.tree;
    }

    updatePtrs() {
        if (!this.changed_pos) {
            return;
        }

        this.ptr = this.tree;

        for (let i = 0; i < this.pos.length - 1; i++) {
            if (!this.ptr[this.pos[i]]) {
                if (Number.isInteger(this.pos[i])) {
                    if (Number.isInteger(this.pos[i + 1])) {
                        this.ptr.push([ ]);
                    } else {
                        this.ptr.push({ });
                    }
                } else {
                    if (Number.isInteger(this.pos[i + 1])) {
                        this.ptr[this.pos[i]] = [ ];
                    } else {
                        this.ptr[this.pos[i]] = { };
                    }
                }
            }
            
            this.ptr = this.ptr[this.pos[i]];
        }

        this.changed_pos = false;
    }

    enterPos(pos) {
        this.pos.push(pos);

        this.changed_pos = true;
    }

    leavePos() {
        const pos = this.pos.pop();

        this.changed_pos = true;

        return pos;
    }

    getFullPos() {
        return this.pos;
    }

    getTopPos() {
        if (this.pos.length === 0) {
            return null;
        }
        return this.pos[this.pos.length - 1];
    }

    getPosValue() {
        this.updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            return this.tree;
        } else {
            return this.ptr[pos];
        }
    }

    setPosValue(value) {
        this.updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            this.tree = value;
        } else {
            this.ptr[pos] = value;
        }
    }

    putPosValue(value) {
        this.updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            if (!this.tree) {
                this.tree = [ ];
            } else if (!Array.isArray(this.tree)) {
                const temp = this.tree;
                this.tree = [ ];
                this.tree.push(temp);
            }
            this.tree.push(value);
        } else {
            if (!this.ptr[pos]) {
                this.ptr[pos] = [ ];
            } else if (!Array.isArray(this.ptr[pos])) {
                const temp = this.ptr[pos];
                this.ptr[pos] = [ ];
                this.ptr[pos].push(temp);
            }
            this.ptr[pos].push(value);
        }
    }

    isPosEmpty() {
        this.updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            return this.tree === undefined;
        }
        return this.ptr[pos] === undefined;
    }

    isPosRoot() {
        return this.pos.length === 0;
    }

    enterStack(opts = { }) {
        opts.append_mode = opts.append_mode ?? true;

        if (this.getTopPos() != 'stack') {
            this.enterPos('stack');
        }

        if (opts.append_mode) {
            const done = this.getPosValue() ?? [ ];
            this.enterPos(done.length);
        } else {
            this.enterPos(0);
        }
        
    }

    leaveStack(opts = { }) {
        opts.root = opts.root ?? false;

        while (this.leavePos() != 'stack');

        if (!opts.root) {
            if (this.isPosRoot()) {
                throw new LogicError(`Attempted to descend from the root stack, which isn't allowed.`);
            }
        }
    }

    prevItem() {
        while (this.pos[this.pos.length - 2] != 'stack') {
            this.leavePos();
        }

        if (!this.isPosEmpty()) {
            const idx = this.leavePos();
            this.enterPos(idx - 1);
        }
    }

    nextItem() {
        while (this.pos[this.pos.length - 2] != 'stack') {
            this.leavePos();
        }

        if (!this.isPosEmpty()) {
            const idx = this.leavePos();
            this.enterPos(idx + 1);
        }
    }

    getRaw() {
        return this.tree;
    }
}
