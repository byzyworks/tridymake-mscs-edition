import * as common   from '../utility/common.js';
import { StateTree } from '../utility/StateTree.js';

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
        let free = target[alias.state];
        
        let reduction = 3;
        if (!opts.strict) {
            if (common.isDictionary(free)) {
                reduction = 0;
            } else if (common.isArray(free)) {
                reduction = 1;
            } else if (free !== undefined) {
                reduction = 2;
            }
        }

        free       = common.toDictionary(free);
        const tree = common.toArray(target[alias.nested]);

        target = new StateTree(free);

        for (let mod of tree) {
            // Don't move "mod =" before "type ="; "_compressModuleHeavy()" truncates the type specifier.
            type = common.isDictionary(mod) ? mod[alias.type] : null;

            mod = this._compressModuleHeavy(mod, alias, opts);
            if (mod === undefined) {
                continue;
            }

            const is_xml = (target.enterGetAndLeave('_format') === 'xml');

            if (is_xml) {
                target.enterPos('unparsed');
            }
            
            if (common.isObject(type) || (type === undefined)) {
                target.enterPos(0);
                while (!target.isPosValueUndefined()) {
                    target.nextItem({ simple: true });
                }
            } else {
                target.enterPos(type);
            }
            //target.putPosValue(mod); // Commented out currently; see the comments below.
            target.putPosValue(mod, { force_array: opts.strict });
            target.leavePos();

            if (is_xml) {
                target.leavePos();
            }
        }

        target = target.getRaw();
        if (!opts.strict) {
            // target.putPosValue() creates an array always, even if there's just 1 element.
            // It's not known if there will be only 1 element until the very end.
            // Don't attempt to reduce before the for loop is done - you will encounter problems.
            // This is commented out for future use, even though the behavior is correct.
            // The problem is while it allows empty objects to appear as values,
            // It simultaneously prevents them from becoming containers or default values.
            // Being able to have defaultable containers is decidedly more important right now.
            // Once the language is remodeled, this won't be an issue.
            /*
            for (const key in target) {
                if (common.isArray(target[key])) {
                    if (target[key].length === 1) {
                        target[key] = target[key][0];
                    }
                }
            }
            */

            target = common.reduce(target, opts = { degree: reduction });
        }

        return target;
    }

    static compressModule(module, alias, lvl = 0) {
        switch (lvl) {
            case 0:
                return module;
            case 1:
                module = common.deepCopy(module);
                module = new StateTree(module, alias);
                this._compressModuleLite(module, alias, { typeless: true, tagless: false });
                return module.getRaw();
            case 2:
                module = common.deepCopy(module);
                module = new StateTree(module, alias);
                this._compressModuleLite(module, alias, { typeless: false, tagless: true });
                return module.getRaw();
            case 3:
                module = common.deepCopy(module);
                module = new StateTree(module, alias);
                this._compressModuleLite(module, alias, { typeless: true, tagless: true });
                return module.getRaw();
            case 4:
                module = common.deepCopy(module);
                return this._compressModuleHeavy(module, alias, { strict: true });
            case 5:
                module = common.deepCopy(module);
                return this._compressModuleHeavy(module, alias, { strict: false });
            default:
                return null;
        }
    }
}
