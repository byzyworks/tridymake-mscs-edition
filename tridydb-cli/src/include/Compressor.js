import { StateTree } from './StateTree.js';

import * as common from '../utility/common.js';

export class Compressor {
    constructor() { }

    static _compressModuleLite(target, alias, opts = { }) {
        opts.typeless = opts.typeless ?? false;
        opts.tagless  = opts.tagless  ?? false;

        if (!common.isDictionary(target.getPosValue())) {
            return;
        }

        if (opts.typeless) {
            target.enterDeleteAndLeave(alias.type);
        }
        if (opts.tagless) {
            target.enterDeleteAndLeave(alias.tags);
        }

        target.traverse(() => {
            this._compressModuleLite(target, alias, opts);
        });
    }

    static _compressModuleHeavy(target, alias, opts = { }) {
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
        let free                = target[alias.state];
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

        const tree = common.toArray(target[alias.nested]);

        target = new StateTree(free);

        for (let mod of tree) {
            // Don't move "sub =" before "type ="; "_compressModuleHeavy()" truncates the type specifier.
            type = common.isDictionary(mod) ? mod[alias.type] : null;

            mod = this._compressModuleHeavy(mod, alias, opts);
            if (mod === undefined) {
                continue;
            }

            if (target.enterGetAndLeave('_xml') === true) {
                target.enterPos('unparsed');
            }
            
            if (common.isPrimitive(type)) {
                target.enterPos(type);
                if (opts.strict) {
                    if (common.isArray(target.getPosValue()) || target.isPosUndefined()) {
                        target.putPosValue(mod);
                    } else {
                        target.leavePos();
                        target.enterPos(0);
                        while (!target.isPosUndefined()) {
                            target.nextItem({ simple: true });
                        }
                        target.setPosValue(mod);
                        target.leavePos();
                        target.enterPos(type);
                    }
                } else if (target.isPosUndefined()) {
                    target.setPosValue(mod);
                } else {
                    target.putPosValue(mod);
                }
                target.leavePos();
            } else {
                target.enterPos(0);
                while (!target.isPosUndefined()) {
                    target.nextItem({ simple: true });
                }
                if (opts.strict) {
                    target.putPosValue(mod);
                } else {
                    target.setPosValue(mod);
                }
                target.leavePos();
            }

            if (target.enterGetAndLeave('_xml') === true) {
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

    static compressModule(module, alias, lvl = 0) {
        module = common.deepCopy(module);

        switch (lvl) {
            case 1:
                module = new StateTree(module, alias);
                this._compressModuleLite(module, alias, { typeless: true, tagless: false });
                module = module.getRaw();
                break;
            case 2:
                module = new StateTree(module, alias);
                this._compressModuleLite(module, alias, { typeless: false, tagless: true });
                module = module.getRaw();
                break;
            case 3:
                module = new StateTree(module, alias);
                this._compressModuleLite(module, alias, { typeless: true, tagless: true });
                module = module.getRaw();
                break;
            case 4:
                module = this._compressModuleHeavy(module, alias, { strict: true });
                break;
            case 5:
                module = this._compressModuleHeavy(module, alias, { strict: false });
                break;
        }

        return module;
    }
}
