import * as common from '../utility/common.js';

/**
 * A generalized class that is basically an iterable n-ary tree, used as both a skeleton for the Tridy database, and for the abstract syntax tree used to prepare it.
 * Underneath, it's just an object that the class method provides a means to traversing around via. iterator, placing values and such.
 * 
 * Primarily, nodes are accessed by entering and leaving "positions", which are tracked as an array of array indices leading up from the root.
 * The position identifies a node in the tree by its location, being the indices needed to reach it from the root.
 * A reference/pointer to the node is created (if it doesn't exist yet) once a write is requested at the currently-set position.
 * 
 * Since all non-leaf nodes are either arrays or maps themselves, every node in the tree can be accessed in such a way.
 * However, it means having to keep track of the position stack so long as the same tree is used.
 * 
 * When it no longer serves to access the tree through an iterable, getRaw() can be used to acquire the underlying object.
 */
export class StateTree {
    constructor(imported = null, alias = { }) {
        this._pos         = [ ];
        this._changed_pos = false;

        if (imported) {
            this._tree = imported;
        } else {
            this._tree = { };
        }

        this._ptr = this._tree;

        /**
         * Mind that this doesn't pay attention to what the user-given values for alias are.
         * As one such state tree, it matters with how the database is stored.
         * However, this same class is used for the abstract syntax tree as well.
         * As the user doesn't interface with the AST, there is no reason to have it depend on user-given aliases.
         * In fact, involving user aliases before setting up the database is detrimental.
         * That can lead to an unneeded situation where a client and server are forced to agree on these aliases in order to work together.
         * That is because the client might handle the AST solely, while the server handles the database and only receives the AST.
         * Therefore, the program defaults are always used up until composition.
         * That is, where a StateTree with "alias" filled by user values is constructed.
         */
        this._alias = {
            type:   alias.type   ?? common.global.defaults.alias.type,
            tags:   alias.tags   ?? common.global.defaults.alias.tags,
            state:  alias.state  ?? common.global.defaults.alias.state,
            nested: alias.nested ?? common.global.defaults.alias.nested
        };
    }

    /**
     * This does not actually change the reference to match the current position exactly. Instead, it sets the pointer to the current position minus the last index.
     * This is because then accessing the pointer via. the last index (via. ptr[this._getTopPos()]) means the pointer has a reference to that last index, rather than just the value of it.
     * This is needed so the tree can be written to at the location of the last index, and opposed to just being able to read at the index.
     * 
     * If the position of the second-to-last index does not exist yet in the tree, it will be generated first based on the type of the last index.
     * If it is a number, then that must mean what's at the second-to-last index is an array. If it's a string, that must mean it's a map.
     * If it doesn't do this first, it will try to access an element of undefined, which inevitably would throw errors.
     */
    _updatePtrs() {
        if (!this._changed_pos) {
            return;
        }

        this._ptr = this._tree;

        for (let i = 0; i < this._pos.length - 1; i++) {
            if (this._ptr[this._pos[i]] === undefined) {
                if (Number.isInteger(this._pos[i])) {
                    if (Number.isInteger(this._pos[i + 1])) {
                        this._ptr.push([ ]);
                    } else {
                        this._ptr.push({ });
                    }
                } else {
                    if (Number.isInteger(this._pos[i + 1])) {
                        this._ptr[this._pos[i]] = [ ];
                    } else {
                        this._ptr[this._pos[i]] = { };
                    }
                }
            }
            
            this._ptr = this._ptr[this._pos[i]];
        }

        this._changed_pos = false;
    }

    enterPos(pos) {
        this._pos.push(pos);

        this._changed_pos = true;
    }

    leavePos() {
        const pos = this._pos.pop();

        this._changed_pos = true;

        return pos;
    }

    getFullPos() {
        return this._pos;
    }

    getTopPos() {
        if (this._pos.length === 0) {
            return null;
        }
        return this._pos[this._pos.length - 1];
    }

    getPosValue() {
        let ptr = this._tree;
        for (let i = 0; i < this._pos.length - 1; i++) {
            if (!common.isObject(ptr[this._pos[i]])) {
                return undefined;
            }
            ptr = ptr[this._pos[i]];
        }

        const pos = this.getTopPos();
        if (pos === null) {
            return ptr;
        }
        return ptr[pos];
    }

    setPosValue(value) {
        this._updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            this._tree = value;
        } else {
            this._ptr[pos] = value;
        }
    }

    putPosValue(value) {
        this._updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            if (this._tree === undefined) {
                this._tree = [ ];
            } else if (!Array.isArray(this._tree)) {
                const temp = this._tree;
                this._tree = [ ];
                this._tree.push(temp);
            }
            this._tree.push(value);
        } else {
            if (this._ptr[pos] === undefined) {
                this._ptr[pos] = [ ];
            } else if (!Array.isArray(this._ptr[pos])) {
                const temp = this._ptr[pos];
                this._ptr[pos] = [ ];
                this._ptr[pos].push(temp);
            }
            this._ptr[pos].push(value);
        }
    }

    copyPosValue(target) {
        target.setPosValue(this.getPosValue());
    }

    enterGetAndLeave(pos) {
        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this.enterPos(part);
        }
        const result = this.getPosValue();
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
        }

        return result;
    }

    enterSetAndLeave(pos, value) {
        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this.enterPos(part);
        }
        this.setPosValue(value);
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
        }
    }

    enterPutAndLeave(pos, value) {
        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this.enterPos(part);
        }
        this.putPosValue(value);
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
        }
    }

    enterCopyAndLeave(target, pos) {
        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this.enterPos(part);
            target.enterPos(part);
        }
        this.copyPosValue(target);
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
            target.leavePos();
        }
    }

    isPosEmpty() {
        let ptr = this._tree;
        for (let i = 0; i < this._pos.length - 1; i++) {
            if (!common.isObject(ptr[this._pos[i]])) {
                return true;
            }
            ptr = ptr[this._pos[i]];
        }

        const pos = this.getTopPos();
        if (pos === null) {
            return common.isEmpty(ptr);
        }
        return common.isEmpty(ptr[pos]);
    }

    isPosUndefined() {
        return this.getPosValue() === undefined;
    }

    isPosRoot() {
        return this._pos.length === 0;
    }

    enterNested(opts = { }) {
        opts.append_mode = opts.append_mode ?? true;

        if (this.getTopPos() !== this._alias.nested) {
            this.enterPos(this._alias.nested);
        }

        if (opts.append_mode) {
            const done = this.getPosValue() ?? [ ];
            this.enterPos(done.length);
        } else {
            this.enterPos(0);
        }
    }

    leaveNested() {
        while (this.leavePos() !== this._alias.nested);
    }

    nextItem() {
        if (this._pos.length === 1) {
            const idx = this.leavePos();
            this.enterPos(idx + 1);
        } else if (this._pos.length > 1) {
            while (this._pos[this._pos.length - 2] !== this._alias.nested) {
                this.leavePos();
            }
    
            if (this.getTopPos() < 0) {
                this.leavePos();
                this.enterPos(0);
            } else {
                const idx = this.leavePos();
                this.enterPos(idx + 1);
            }
        }
    }

    traverse(callback) {
        this.enterPos(this._alias.nested);
        if (!this.isPosEmpty()) {
            this.enterPos(0);
            while (!this.isPosUndefined()) {
                callback();
                this.nextItem();
            }
            this.leavePos();
        }
        this.leavePos();
    }

    getRaw() {
        return this._tree;
    }
}
