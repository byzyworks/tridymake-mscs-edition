import { isEmpty } from '../../utility/common.js';

export class StateTree {
    pos  = [ ];
    tree = { };
    ptr  = null;
    changed_pos = true;

    constructor() {
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

    enterPos(pos, assert = null) {
        this.pos.push(pos);

        if (assert) {
            this.assertPos(opts.assert);
        }

        this.changed_pos = true;
    }

    leavePos() {
        const pos = this.getTopPos();

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

        return this.ptr[this.getTopPos()];
    }

    setPosValue(value) {
        this.updatePtrs();

        const pos = this.getTopPos();

        this.ptr[pos] = value;
    }

    putPosValue(value) {
        this.updatePtrs();

        const pos = this.getTopPos();

        if (!this.ptr[pos]) {
            this.ptr[pos] = [ ];
        } else if (!Array.isArray(this.ptr[pos])) {
            const temp = this.ptr[pos];
            this.ptr[pos] = [ ];
            this.ptr[pos].push(temp);
        }
        this.ptr[pos].push(value);
    }

    isPosEmpty() {
        this.updatePtrs();

        return this.ptr[this.getTopPos()] === undefined;
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
        return this.tree;
    }
}
