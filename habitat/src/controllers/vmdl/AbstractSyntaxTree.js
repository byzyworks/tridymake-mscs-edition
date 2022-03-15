export class AbstractSyntaxTree {
    pos  = [ ];
    tree = {
        value: { },
        final: { },
        ready: { }
    };
    ptr = {
        to_value: null,
        to_ready: null,
        to_final: null
    };
    changed_pos = true;

    constructor() {
        this.ptr.to_value = this.tree.value;
        this.ptr.to_ready = this.tree.ready;
        this.ptr.to_final = this.tree.final;
    }

    badInput() {
        throw new Error(JSON.stringify(this.pos));
    }

    updatePtrs() {
        if (!this.changed_pos) {
            return;
        }

        this.ptr.to_value = this.tree.value;
        this.ptr.to_ready = this.tree.ready;
        this.ptr.to_final = this.tree.final;

        for (let i = 0; i < this.pos.length - 1; i++) {
            if (!this.ptr.to_value[this.pos[i]]) {
                if (Number.isInteger(this.pos[i])) {
                    if (Number.isInteger(this.pos[i + 1])) {
                        this.ptr.to_value.push([ ]);
                        this.ptr.to_ready.push([ ]);
                        this.ptr.to_final.push([ ]);
                    } else {
                        this.ptr.to_value.push({ [this.pos[i + 1]]: { } });
                        this.ptr.to_ready.push({ [this.pos[i + 1]]: { } });
                        this.ptr.to_final.push({ [this.pos[i + 1]]: { } });
                    }
                } else {
                    if (Number.isInteger(this.pos[i + 1])) {
                        this.ptr.to_value[this.pos[i]] = [ ];
                        this.ptr.to_ready[this.pos[i]] = [ ];
                        this.ptr.to_final[this.pos[i]] = [ ];
                    } else {
                        this.ptr.to_value[this.pos[i]] = { [this.pos[i + 1]]: { } };
                        this.ptr.to_ready[this.pos[i]] = { [this.pos[i + 1]]: { } };
                        this.ptr.to_final[this.pos[i]] = { [this.pos[i + 1]]: { } };
                    }
                }
            }
            
            this.ptr.to_value = this.ptr.to_value[this.pos[i]];
            this.ptr.to_ready = this.ptr.to_ready[this.pos[i]];
            this.ptr.to_final = this.ptr.to_final[this.pos[i]];
        }

        this.changed_pos = false;
    }

    enterPos(pos, assert = null) {
        if (this.ptr.to_final[pos] === true) {
            this.badInput();
        }

        this.pos.push(pos);

        if (assert) {
            this.assertPos(opts.assert);
        }

        this.changed_pos = true;
    }

    leavePos() {
        const pos = this.getTopPos();

        if (this.ptr.to_ready[pos] === false) {
            this.badInput();
        }

        const left = this.pos.pop();

        this.changed_pos = true;

        return left;
    }

    getFullPos() {
        return this.pos;
    }

    getTopPos() {
        return this.pos[this.pos.length - 1];
    }

    getPosValue() {
        this.updatePtrs();

        return this.ptr.to_value[this.getTopPos()];
    }

    setPosValue(value, opts = { }) {
        opts.ready = opts.ready ?? true;
        opts.final = opts.final ?? true;

        this.updatePtrs();

        const pos = this.getTopPos();

        this.ptr.to_value[pos] = value;

        if (opts.ready) {
            this.ptr.to_ready[pos] = true;
        } else {
            this.ptr.to_ready[pos] = false;
        }
        
        if (opts.final) {
            this.ptr.to_final[pos] = true;
        } else {
            this.ptr.to_final[pos] = false;
        }
    }

    putPosValue(value, opts = { }) {
        opts.ready = opts.ready ?? true;
        opts.final = opts.final ?? true;

        this.updatePtrs();

        const pos = this.getTopPos();

        if (!this.ptr.to_value[pos]) {
            this.ptr.to_value[pos] = [ ];
        } else if (!Array.isArray(this.ptr.to_value[pos])) {
            const temp = this.ptr.to_value[pos];
            this.ptr.to_value[pos] = [ ];
            this.ptr.to_value[pos].push(temp);
        }
        this.ptr.to_value[pos].push(value);
        
        if (opts.ready) {
            this.ptr.to_ready[pos] = true;
        } else {
            this.ptr.to_ready[pos] = false;
        }
        
        if (opts.final) {
            this.ptr.to_final[pos] = true;
        } else {
            this.ptr.to_final[pos] = false;
        }
    }

    isPosEmpty() {
        this.updatePtrs();

        return this.ptr.to_value[this.getTopPos()] === undefined;
    }

    assertPos(assert) {
        let failed = false;
                
        const off = this.pos.length - assert.length;

        for (let i = 0; i < assert.length; i++) {
            if (this.pos[off + i] != assert[i]) {
                failed = true;
                break;
            }
        }

        if (failed) {
            failed = [ ];
            for (let i = off; i < this.pos.length; i++) {
                failed.push(this.pos[i]);
            }
        }

        if (failed) {
            let msg = '';
            msg += 'Unmatching context. Expected ';
            msg += JSON.stringify(assert);
            msg += ', but got ';
            msg += JSON.stringify(failed);
            msg += ' instead.'
            throw new Error(msg);
        }
    }

    isPosRoot() {
        return this.pos.length == 0;
    }

    enterStack() {
        if (this.getTopPos() == 'stack') {
            this.assertPos(['stmt', 'definition', 'stack']);
        } else if (!this.isPosRoot()) {
            this.assertPos(['stmt', 'definition']);
            this.enterPos('stack');
        } else {
            this.enterPos('stack');
        }

        const done = this.getPosValue() ?? [ ];
        this.enterPos(done.length);

        this.enterPos('stmt');
    }

    leaveStack(opts = { }) {
        opts.root = opts.root ?? false;

        while (this.leavePos() != 'stack');

        if (!opts.root) {
            if (this.isPosRoot()) {
                this.badInput();
            }
        }
    }

    nextItem() {
        while (this.leavePos() != 'stmt');

        if (!this.isPosEmpty()) {
            const idx = this.leavePos();
            this.enterPos(idx + 1);
        }

        this.enterPos('stmt');
    }

    getRaw() {
        return this.tree.value;
    }
}
