import { LogicError } from '../../utility/error.js';
import { isEmpty }    from '../../utility/common.js';

export class StateTree {
    pos  = [ ];
    tree = {
        value: { },
        ready: { },
        final: { }
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
                        this.ptr.to_value.push({ });
                        this.ptr.to_ready.push({ });
                        this.ptr.to_final.push({ });
                    }
                } else {
                    if (Number.isInteger(this.pos[i + 1])) {
                        this.ptr.to_value[this.pos[i]] = [ ];
                        this.ptr.to_ready[this.pos[i]] = [ ];
                        this.ptr.to_final[this.pos[i]] = [ ];
                    } else {
                        this.ptr.to_value[this.pos[i]] = { };
                        this.ptr.to_ready[this.pos[i]] = { };
                        this.ptr.to_final[this.pos[i]] = { };
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
            throw new LogicError(`Attempted to enter AST position "${pos}" from ${JSON.stringify(this.pos)}, but "${pos}" has already been finalized.`);
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
            throw new LogicError(`Attempted to leave AST position "${pos}" from ${JSON.stringify(this.pos)}, but "${pos}" is not modified sufficiently yet.`);
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
        const off = this.pos.length - assert.length;

        let failed = false;
        for (let i = 0; i < assert.length; i++) {
            if (this.pos[off + i] != assert[i]) {
                failed = true;
                break;
            }
        }

        let fail_list = [ ]
        if (failed) {
            for (let i = off; i < this.pos.length; i++) {
                fail_list.push(this.pos[i]);
            }
        }

        if (!isEmpty(fail_list)) {
            throw new LogicError(`Unmatching AST position. Expected ${JSON.stringify(assert)}, but got ${JSON.stringify(fail_list)} instead.`);
        }
    }

    isPosRoot() {
        return this.pos.length === 0;
    }

    enterStack() {
        if (this.getTopPos() != 'stack') {
            this.enterPos('stack');
        }

        const done = this.getPosValue() ?? [ ];
        this.enterPos(done.length);
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
        return this.tree.value;
    }
}
