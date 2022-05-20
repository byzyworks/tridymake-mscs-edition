import { StateTree } from './StateTree.js';

import * as common from '../utility/common.js';

class Compressor {
    constructor() { }

    _compressModuleLite(target, opts = { }) {
        opts.typeless = opts.typeless ?? false;
        opts.tagless  = opts.tagless  ?? false;

        if (!common.isDictionary(target.getPosValue())) {
            return;
        }

        if (opts.typeless) {
            target.enterSetAndLeave(common.global.alias.type, undefined);
        }
        if (opts.tagless) {
            target.enterSetAndLeave(common.global.alias.tags, undefined);
        }

        target.enterPos(common.global.alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosUndefined()) {
                this._compressModuleLite(target, opts);
                target.nextItem();
            }
            target.leavePos();
        }
        target.leavePos();
    }

    _compressModuleHeavy(target, opts = { }) {
        opts.strict = opts.strict ?? false;

        if (!common.isDictionary(target)) {
            return target;
        }

        let type;

        /**
         * The point of the flags below is to prevent unnecessary modification to the free data structure when compressing.
         * We only want to perform compression with respect to data that is generated automatically during compression.
         * In other words, if the user explicitly posts to the module free data like [ "this" ] or { "0": "that" },
         * then it should be assumed that the use of an object container is deliberate and not meant to be altered.
         * That is even if we "could" reduce these down to simply "this" and "that".
         * The free data structure is meant to contain arbitrary user data that should be altered by TridyDB as little as possible.
         */
        let free                = target[common.global.alias.state];
        let reduce_to_array     = true;
        let reduce_to_primitive = true;
        let reduce_to_nothing   = true;
        if (!opts.strict) {
            if (free !== undefined) {
                reduce_to_nothing = false;

                if (common.isDictionary(free)) {
                    reduce_to_array = false;
                } else if (common.isArray(free)) {
                    reduce_to_primitive = false;
                }
            }
        }
        free = common.toDictionary(free);

        const tree = common.toArray(target[common.global.alias.nested]);

        target = new StateTree(free);

        for (let sub of tree) {
            // Don't move "sub =" before "type ="; "_compressModuleHeavy()" truncates the type specifier.
            type = common.isDictionary(sub) ? sub[common.global.alias.type] : null;

            sub = this._compressModuleHeavy(sub, opts);
            if (sub === undefined) {
                continue;
            }
            
            if (common.isPrimitive(type)) {
                target.enterPos(type);
                if (opts.strict) {
                    if (common.isArray(target.getPosValue()) || target.isPosUndefined()) {
                        target.putPosValue(sub);
                    } else {
                        target.leavePos();
                        target.enterPos(0);
                        while (!target.isPosUndefined()) {
                            target.nextItem();
                        }
                        target.setPosValue(sub);
                        target.leavePos();
                        target.enterPos(type);
                    }
                } else if (target.isPosUndefined()) {
                    target.setPosValue(sub);
                } else {
                    target.putPosValue(sub);
                }
                target.leavePos();
            } else {
                target.enterPos(0);
                while (!target.isPosUndefined()) {
                    target.nextItem();
                }
                if (opts.strict) {
                    target.putPosValue(sub);
                } else {
                    target.setPosValue(sub);
                }
                target.leavePos();
            }
        }

        target = target.getRaw();

        if (!opts.strict) {
            if (reduce_to_array && common.isArrayableObject(target)) {
                const reduced = [ ];
                for (const part of Object.values(target)) {
                    reduced.push(part);
                }
                target = reduced;

                if (reduce_to_primitive && (reduced.length === 1)) {
                    target = reduced[0];
                } else if (reduce_to_nothing && (reduced.length === 0)) {
                    target = undefined;
                }
            }
        }

        return target;
    }

    compressModule(module, lvl = 0) {
        module = common.deepCopy(module);

        switch (lvl) {
            case 1:
                module = new StateTree(module);
                this._compressModuleLite(module, { typeless: true, tagless: false });
                module = module.getRaw();
                break;
            case 2:
                module = new StateTree(module);
                this._compressModuleLite(module, { typeless: false, tagless: true });
                module = module.getRaw();
                break;
            case 3:
                module = new StateTree(module);
                this._compressModuleLite(module, { typeless: true, tagless: true });
                module = module.getRaw();
                break;
            case 4:
                module = this._compressModuleHeavy(module, { strict: true });
                break;
            case 5:
                module = this._compressModuleHeavy(module, { strict: false });
                break;
        }

        return module;
    }
}

export const compressor = new Compressor();
