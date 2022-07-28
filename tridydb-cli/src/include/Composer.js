import path              from 'path';
import { fileURLToPath } from 'url';

import seedrandom from 'seedrandom';
import shuffle    from 'knuth-shuffle-seeded';
import uuid       from 'uuid-random';

import { Compressor }    from './Compressor.js';
import { ContextParser } from './ContextParser.js';

import * as common     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { StateTree }   from '../utility/StateTree.js';
import { Tag }         from '../utility/Tag.js';

import { FunctionError } from '../utility/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export class Composer {
    constructor(aliases) {
        this._alias  = aliases;
        this._target = new StateTree(null, this._alias);
        this.setRandomSeeds();
    }

    getAliases() {
        return this._alias;
    }

    setAliases(aliases) {
        this._alias  = aliases;
        this._target = new StateTree(this._target.getRaw(), aliases);
    }

    getRandomSeeds() {
        return this._random.seeds;
    }

    setRandomSeeds(seeds) {
        // Do not unflatten this; "prng" references "seeds".
        this._random       = { };
        this._random.seeds = seeds ?? [ seedrandom().int32() ];
        this._random.prng  = new seedrandom(''.concat(this._random.seeds[0]), { entropy: false });
    }

    _getModuleShuffledIndex(lvl, index, random) {
        const last_index  = index.real[lvl];
        const last_extent = index.extent[lvl];

        // Using the query random plus the parent's index ensures all children of the same parent use the same seed.
        let suffix = index.real.slice(0, lvl).join(':');
        if (!common.isEmpty(suffix)) {
            suffix = ':' + suffix;
        }
        const seed = random + suffix;

        const shuffled = shuffle([...Array(last_extent).keys()], seed);

        return shuffled[last_index];
    }

    async _matchingTagValue(test, b, lvl, index, random) {
        if (!common.isNullish(test.function)) {
            const func   = test.function[0];
            const params = {
                index: index,
                random: {
                    global: this._random.seeds,
                    query:  random
                },
                args: test.function
            };

            const result = await this._functionCall(func, params, { primitive_only: true });

            return result;
        }

        // Note the variables below all have a minimum value of 0 (inclusive).
        // This does not include tags, which can store negative values.
        switch (test.val) {
            case '$D':
                return lvl;
            case '$C':
                return index.extent[lvl + 1];
            case '$I':
                if (!isNaN(b.val) && (Number(b.val) < 0)) {
                    return (index.extent[lvl] - index.real[lvl]) * -1;
                }
                return index.real[lvl];
            case '$N':
                return index.extent[lvl] - 1;
            case '$Q':
                return random;
            case '$S':
                if (!isNaN(b.val) && (Number(b.val) < 0)) {
                    return (index.extent[lvl] - this._getModuleShuffledIndex(lvl, index, random)) * -1;
                }
                return this._getModuleShuffledIndex(lvl, index, random);
            case '$R':
                return this._random.prng();
            default:
                for (const tag of index.context[lvl]) {
                    if (test.val === Tag.getIdentifier(tag)) {
                        return Tag.getValue(tag);
                    }
                }

                /**
                 * Literal null can be a tag value, and undefined is returned if the tag is present, but doesn't have a value.
                 * Returning undefined on a tag not present causes problems where $(special_tag == @none) will match tags that aren't special_tag.
                 * @none (undefined) should only match if special_tag is present in the module *and* doesn't have a value.
                 * A tag value, though, can't be anything other than a primitive.
                 * Hence, an empty object can signal that the required tag identifier for comparison is lacking.
                 */
                return { };
        }
    }

    _verifyMatching(answer, test, lvl, index, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        /**
         * The output of this depends on whether the context is "intermediate" (like a in "a/b") or "final" (like b in "a/b").
         * The expression tree contains generated position helpers ("test.end") determining which one the terminal is.
         * It's required that the terminal is evaluated at the last level of the context if the terminal is final.
         * If whether it reaches the last element or not isn't verified, then the expression becomes true not only for the module, but also all of its sub-modules.
         * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
         * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
         * Otherwise, if it's intermediate, it should not matter.
         * 
         * You might think "why not just answer &&= lvl <= info.index.context.length - 1?", and why the position helpers?
         * That's because info.index.context.length is dynamic depending on the module being addressed.
         * If the module is a child module of a correct one, then info.index.context.length is already larger than what the level is, so the comparison would always be true for child modules.
         * That makes the comparison, in effect, pointless.
         * The best way to determine finality appears to be from the expression tree's end, not the module's.
         */
        answer &&= !test.end || (lvl === (index.context.length - 1));

        /**
         * The need for this is because of the confusing reality of some expressions.
         * Consider "(a|(b/c))/d", which is expandable as "a/d" and "b/c/d". Question is, in the original expression, if "(a|(b/c))" is true, at what level should "d" be evaluated at?
         * Normally, the "next level down" is sufficient, but the entirety of "(a|(b/c))" starts at level 0, and "d" at level 1 only includes "a/d" and thus ignores "b/c/d" at level 2.
         * As a result, the level stopped at is important for the calling operation to know.
         */
        if ((answer === true) && (opts.tracked instanceof Set)) {
            opts.tracked.add(lvl);
        }

        return answer;
    }

    _matchingTag(test, lvl, index, random, opts = { }) {
        let answer;

        switch (test.val) {
            case '*':
                answer = true;
                break;
            default:
                answer = false;
                for (const tag of index.context[lvl]) {
                    if (test.val === Tag.getIdentifier(tag)) {
                        answer = true;
                        break;
                    }
                }
                break;
        }

        return this._verifyMatching(answer, test, lvl, index, opts);
    }

    async _matchingValueExpression(a, b, op, lvl, index, random, opts = { }) {
        let answer = await this._matchingTagValue(a, b, lvl, index, random);

        if (common.isDictionary(answer)) {
            answer = false;
        } else {
            switch (op) {
                case '$==':
                    answer = answer === b.val;
                    break;
                case '$!=':
                    answer = answer !== b.val;
                    break;
                case '$<':
                    answer = answer < b.val;
                    break;
                case '$<=':
                    answer = answer <= b.val;
                    break;
                case '$>':
                    answer = answer > b.val;
                    break;
                case '$>=':
                    answer = answer >= b.val;
                    break;
            }
        }

        return this._verifyMatching(answer, a, lvl, index, opts);
    }

    async _testLookaheadRecursive(b, lvl, index, random, recursive, opts = { }) {
        const child_subcontext = [ ];
        
        // Needed if @parent/@ascend is used with @to/@toward and is in the LHS of the @to/@toward expression.
        // The target's context needs to be aligned with that of the parent that's supposed to be evaluated.
        const parent_diff = index.context.length - lvl;
        for (let i = 0; i < parent_diff; i++) {
            child_subcontext.push(this._target.leavePos());
            child_subcontext.push(this._target.leavePos());
        }

        let b_index;

        let answer = false;

        this._target.enterPos(this._alias.nested);
        if (!this._target.isPosEmpty()) {
            this._target.enterPos(0);
            while (!this._target.isPosUndefined()) {
                b_index = this._getModuleIndex();

                answer = await this._matchingExpression(b, lvl, b_index, random, opts);

                if (recursive && (answer === false)) {
                    lvl++;

                    answer = await this._testLookaheadRecursive(b, lvl, b_index, random, recursive, opts);
                }
                if (answer === true) {
                    break;
                }

                this._target.nextItem();
            }
            this._target.leavePos();
        }
        this._target.leavePos();

        while (child_subcontext.length > 0) {
            this._target.enterPos(child_subcontext.pop());
        }

        return answer;
    }

    async _testLookahead(a, b, lvl, index, random, recursive, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = await this._matchingExpression(a, lvl, index, random, a_opts);

        const b_opts        = { recurse: true, tracked: new Set() };
        let   b_answer_part = false;
        let   b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl + 1;

                b_answer_part = await this._testLookaheadRecursive(b, lvl, index, random, recursive, b_opts);

                if ((b_answer_part === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(cand_lvl);
                }

                b_answer ||= b_answer_part;
            }
        }

        return a_answer && b_answer;
    }

    async _testLookbehind(a, b, lvl, index, random, recursive, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = await this._matchingExpression(a, lvl, index, random, a_opts);

        const b_opts        = { tracked: new Set() };
        let   b_answer_part = false;
        let   b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl - 1;

                if (recursive) {
                    while ((b_answer_part === false) && (lvl >= 0)) {
                        b_answer_part = await this._matchingExpression(b, lvl, index, random, b_opts);
    
                        lvl--;
                    }
                } else {
                    b_answer_part = await this._matchingExpression(b, lvl, index, random, b_opts);
                }
                
                if ((b_answer_part === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(cand_lvl);
                }

                b_answer ||= b_answer_part;
            }
        }

        return a_answer && b_answer;
    }

    async _testTransitive(a, b, lvl, index, random, recursive, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = await this._matchingExpression(a, lvl, index, random, a_opts);

        let b_answer_part = false;
        let b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl + 1;

                if (recursive) {
                    while ((b_answer_part === false) && (lvl < index.context.length)) {
                        b_answer_part = await this._matchingExpression(b, lvl, index, random, opts);

                        lvl++;
                    }
                    b_answer ||= b_answer_part;
                } else {
                    b_answer ||= await this._matchingExpression(b, lvl, index, random, opts);
                }
            }
        }

        return a_answer && b_answer;
    }

    _isExpressionTreeLeaf(obj) {
        return common.isDictionary(obj) && (obj.val !== undefined);
    }

    async _matchingExpression(test, lvl, index, random, opts = { }) {
        if (common.isEmpty(test)) {
            return index.context.length === lvl;
        } else if (common.isEmpty(index.context) || (lvl < 0) || (lvl >= index.context.length)) {
            return false;
        } else if (this._isExpressionTreeLeaf(test)) {
            return this._matchingTag(test, lvl, index, random, opts);
        } else if (test.op[0] === '$') {
            return await this._matchingValueExpression(test.a, test.b, test.op, lvl, index, random, opts);
        } else {
            switch (test.op) {
                case '!':
                    return !(await this._matchingExpression(test.a, lvl, index, random, opts));
                case '&':
                    return await this._matchingExpression(test.a, lvl, index, random, opts) && await this._matchingExpression(test.b, lvl, index, random, opts);
                case '^':
                    const a = await this._matchingExpression(test.a, lvl, index, random, opts);
                    const b = await this._matchingExpression(test.b, lvl, index, random, opts);
                    return (a & !b) || (b & !a);
                case '|':
                    return await this._matchingExpression(test.a, lvl, index, random, opts) || await this._matchingExpression(test.b, lvl, index, random, opts);
                case '>':
                    return await this._testLookahead(test.a, test.b, lvl, index, random, false, opts);
                case '>>':
                    return await this._testLookahead(test.a, test.b, lvl, index, random, true, opts);
                case '<':
                    return await this._testLookbehind(test.a, test.b, lvl, index, random, false, opts);
                case '<<':
                    return await this._testLookbehind(test.a, test.b, lvl, index, random, true, opts);
                case '/':
                    return await this._testTransitive(test.a, test.b, lvl, index, random, false, opts);
                case '//':
                    return await this._testTransitive(test.a, test.b, lvl, index, random, true, opts);
                case '?':
                    if (await this._matchingExpression(test.a, lvl, index, random, opts)) {
                        return await this._matchingExpression(test.b, lvl, index, random, opts);
                    }
                    return await this._matchingExpression(test.c, lvl, index, random, opts);
            }
        }
    }

    _createModuleTemplate(module = null) {
        if (module === null) {
            module = new StateTree(module, this._alias);
        }

        this._astree.enterPos('definition');
        if (!this._astree.isPosUndefined()) {
            module.setPosValue(this._astree.getPosValue());
        }
        this._astree.leavePos();

        return module.getRaw();
    }

    async _functionCall(func, params, opts = { }) {
        opts.primitive_only = opts.primitive_only ?? false;

        let result;

        const funcdir  = path.join(__dirname, '../../functions/');
        let   funcpath = path.join(__dirname, '../../functions/', func + '.js');
        if (!funcpath.startsWith(funcdir)) {
            throw new FunctionError(`Directory traversal outside the function sub-directory is not allowed.`);
        }

        // Because import() doesn't like paths on Windows.
        funcpath = path.relative(__dirname, funcpath);
        funcpath = funcpath.replace('\\', '/');

        try {
            const mod = await import(funcpath);

            result = mod.default(params);
        } catch (err) {
            throw new FunctionError(err.message);
        }

        if (opts.primitive_only) {
            if (common.isObject(result)) {
                result = JSON.stringify(result, null, 0);
            }
        }

        return result;
    }

    async _uniqueCopyTemplate(template, opts = { }) {
        opts.functions = opts.functions ?? null;
        opts.params    = opts.params    ?? null;

        const copy = common.deepCopy(template);

        if (opts.functions !== null) {
            if (!common.isNullish(opts.functions.module)) {
                opts.params.args = opts.functions.module;

                const result = await this._functionCall(opts.functions.module[0], opts.params, { primitive_only: false });

                copy = result;
            } else {
                if (!common.isNullish(opts.functions[common.global.defaults.alias.tags])) {
                    for (let tag in opts.functions[common.global.defaults.alias.tags]) {
                        opts.params.args = opts.functions[common.global.defaults.alias.tags][tag];

                        const result = await this._functionCall(opts.functions[common.global.defaults.alias.tags][tag][0], opts.params, { primitive_only: true });

                        tag = Tag.getTag(tag, result);

                        copy[common.global.defaults.alias.tags] = copy[common.global.defaults.alias.tags] ?? [ ];
                        copy[common.global.defaults.alias.tags].push(tag);
                    }
                }
                if (!common.isNullish(opts.functions[common.global.defaults.alias.type])) {
                    opts.params.args = opts.functions[common.global.defaults.alias.type];

                    const result = await this._functionCall(opts.functions[common.global.defaults.alias.type][0], opts.params, { primitive_only: true });

                    copy[common.global.defaults.alias.type] = result;
                }
                if (!common.isNullish(opts.functions[common.global.defaults.alias.state])) {
                    opts.params.args = opts.functions[common.global.defaults.alias.state];

                    const result = await this._functionCall(opts.functions[common.global.defaults.alias.state][0], opts.params, { primitive_only: false });

                    copy[common.global.defaults.alias.state] = result;
                }
            }
        }

        // A UUID needs to be unique for every copy of a module, even if generated in the same statement.
        if (common.isDictionary(template)) {
            const tags = copy[this._alias.tags];
            if (common.isArray(tags)) {
                for (const i in tags) {
                    if (tags[i] === '@uuid') {
                        tags[i] = uuid();
                    }
                }
            }
        }

        return copy;
    }

    _overwriteModule(template) {
        this._target.setPosValue(template);

        if (!common.isEmpty(this._astree.enterGetAndLeave(common.global.defaults.alias.nested))) {
            this._parse();
        }
    }

    _composeModule(template) {
        if (!common.isDictionary(this._target.getPosValue())) {
            throw new SyntaxError(`Tried to append a new submodule to an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        this._target.enterPos(this._alias.nested);
        this._target.enterPos(this._target.putPosValue(template) - 1);

        if (!common.isEmpty(this._astree.enterGetAndLeave(common.global.defaults.alias.nested))) {
            this._parse();
        }

        this._target.leavePos();
        this._target.leavePos();
    }

    _printModule() {
        this._astree.enterPos('output');

        let copy = this._target.getPosValue();

        copy = Compressor.compressModule(copy, this._alias, this._astree.enterGetAndLeave('compression'));
        if (copy === undefined) {
            copy = { };
        }

        copy = { content: copy, params: this._astree.getPosValue() };

        this._output.modules.push(copy);

        this._astree.leavePos();
    }

    _deleteModule() {
        const spliced = this._target.getTopPos();
        if (spliced === null) {
            // then this module is the root module.
            this._target.setPosValue({ });
        } else {
            this._target.leavePos();
            this._target.getPosValue().splice(spliced, 1);
            
            if ((spliced === 0) && this._target.isPosEmpty()) {
                this._target.setPosValue(undefined);
            }

            /**
             * When target.nextItem() is called, the negative index will auto-reset to 0.
             * The negative index is used so the composer knows to retry 0 after the array has shifted.
             * This is the easiest way to tell that the tree array has already shifted back because of a @del statement.
             */
            this._target.enterPos(spliced - 1);
        }
    }

    _editModulePart(target, template, nulled, key) {
        if ((template[this._alias[key]] !== undefined) || (common.isDictionary(nulled) && (nulled[common.global.defaults.alias[key]] === true))) {
            target.enterSetAndLeave(this._alias[key], template[this._alias[key]]);
        }
    }

    _editModule(template) {
        if (!common.isDictionary(this._target.getPosValue())) {
            throw new SyntaxError(`Tried to edit an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        const nulled = this._astree.enterGetAndLeave('nulled');

        this._editModulePart(this._target, template, nulled, 'type');
        this._editModulePart(this._target, template, nulled, 'tags');
        this._editModulePart(this._target, template, nulled, 'state');

        if (!common.isEmpty(this._astree.enterGetAndLeave(common.global.defaults.alias.nested))) {
            this._target.enterDeleteAndLeave(this._alias.nested);
            this._parse();
        } else if (common.isDictionary(nulled) && (nulled[common.global.defaults.alias.nested] === true)) {
            this._target.enterDeleteAndLeave(this._alias.nested);
        }
    }

    _tagModule(template) {
        if (!common.isDictionary(this._target.getPosValue())) {
            throw new SyntaxError(`Tried to tag an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        this._target.enterPos(this._alias.tags);

        let tags = this._target.getPosValue();

        if (!common.isArray(tags)) {
            if (tags !== undefined) {
                this._target.leavePos();
                throw new SyntaxError(`Tried to tag an improperly-formatted root module (was @set with raw input used to change it?).`);
            }
            tags = [ ];
            this._target.setPosValue(tags);
        }

        if (common.isArray(template[this._alias.tags])) {
            const tagslen = tags.length; // Because the length of the tags array changes as tags are added, and the syntax parser already does a duplicate check.

            let duplicate;
            for (const added of template[this._alias.tags]) {
                duplicate = false;
                for (let i = 0; i < tagslen; i++) {
                    if (tags[i] === added) {
                        duplicate = true;
                        break;
                    }
                }
    
                if (!duplicate) {
                    this._target.putPosValue(added);
                }
            }
        }

        this._target.leavePos();
    }

    _untagModule(template) {
        if (!common.isDictionary(this._target.getPosValue())) {
            throw new SyntaxError(`Tried to untag an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        this._target.enterPos(this._alias.tags);

        const tags = this._target.getPosValue();

        if (!common.isArray(tags)) {
            this._target.leavePos();
            throw new SyntaxError(`Tried to untag an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        if (common.isArray(template[this._alias.tags])) {
            for (const removed of template[this._alias.tags]) {
                for (let i = 0; i < tags.length; i++) {
                    if (tags[i] === removed) {
                        tags.splice(i, 1);
                        i--;
                    }
                }
            }
        }

        if (this._target.isPosEmpty()) {
            this._target.setPosValue(undefined);
        }

        this._target.leavePos();
    }

    _saveModule() {
        this._saved.push(this._target.getPosValue());
    }

    _loadModule() {
        for (const module of this._saved) {
            this._composeModule(common.deepCopy(module));
        }
    }

    _multiModule() {
        let template;
        template = new StateTree(this._target.getPosValue(), this._alias);
        template = this._createModuleTemplate(template);

        if (!common.isEmpty(this._astree.enterGetAndLeave(common.global.defaults.alias.nested))) {
            this._parse();
        }

        this._target.setPosValue(template);
    }

    async _operateModule(command, opts = { }) {
        opts.template  = opts.template  ?? null;
        opts.functions = opts.functions ?? null;
        opts.params    = opts.params    ?? null;

        if (opts.template !== null) {
            opts.template = await this._uniqueCopyTemplate(opts.template, { functions: opts.functions, params: opts.params });
        }

        switch (command) {
            case 'overwrite':
                this._overwriteModule(opts.template);
                break;
            case 'compose':
                this._composeModule(opts.template);
                break;
            case 'print':
                this._printModule();
                break;
            case 'delete':
                this._deleteModule();
                break;
            case 'edit':
                this._editModule(opts.template);
                break;
            case 'tag':
                this._tagModule(opts.template);
                break;
            case 'untag':
                this._untagModule(opts.template);
                break;
            case '_save':
                this._saveModule();
                break;
            case '_load':
                this._loadModule();
                break;
            case 'multi':
            case 'import':
                this._multiModule();
                break;
            case 'nop':
                break;
        }
    }

    _getModuleIndex() {
        const index = {
            real:    [ ],
            extent:  [ ],
            context: [ ]
        }

        const raw = this._target.getFullPos();
        let   ptr = this._target.getRaw();

        /**
         * Note: the indices are how the JSON database is structured at a low level.
         * For instance, the coordinates of the first module under the root module would normally be ['tree'][0].
         * Since it's 2 indices ('tree' and 0) from the perspective of the parent module, we need to make 2 jumps each time.
         */
        for (let i = 0; i < raw.length; i += 2) {
            ptr = ptr[raw[i]];
            if (!common.isArray(ptr)) {
                return index;
            }

            index.real.push(raw[i + 1]);

            index.extent.push(ptr.length);

            ptr = ptr[raw[i + 1]];
            if (!common.isDictionary(ptr)) {
                return index;
            }

            index.context.push(ptr[this._alias.tags] ?? [ ]);
        }

        index.extent.push((ptr[this._alias.nested] ?? [ ]).length);

        return index;
    }

    async _traverseModule(test, command, level, random, opts = { }) {
        opts.template  = opts.template  ?? null;
        opts.functions = opts.functions ?? null;
        opts.limit     = opts.limit     ?? null;
        opts.offset    = opts.offset    ?? 0;
        opts.count     = opts.count     ?? 0;
        opts.stats     = opts.stats     ?? { attempts: 0, successes: 0, indeces: [ ] };

        const index = this._getModuleIndex();

        const matched = await this._matchingExpression(test, level.start, index, random);
        if (matched === true) {
            opts.count++;
        }

        opts.stats.attempts++;

        if (((level.max === null) || (level.current < level.max)) && ((opts.limit === null) || (opts.count < opts.limit))) {
            await this._target.traverseAsync(async () => {
                const new_level = { start: level.start, current: level.current + 1, max: level.max };

                await this._traverseModule(test, command, new_level, random, opts);
                if ((opts.limit !== null) && (opts.count >= opts.limit)) {
                    return 'break';
                }
            });
        }

        const operate = {
            template:  opts.template,
            functions: opts.functions,
            params: {
                index: index,
                random: {
                    global: this._random.seeds,
                    query:  random
                }
            }
        };

        if (matched && (opts.count > opts.offset)) {
            await this._operateModule(command, operate);

            opts.stats.successes++;
            opts.stats.indeces.push(index.real.join(','));
        }

        return matched;
    }

    _getStartingLevel() {
        // The 2 is determined from the number of (looping) indices required for one level of nesting.
        // Level 0 has the position ['tree'][#], level 1 is at ['tree'][#]['tree'][#], and so on.
        return this._target.getFullPos().length / 2;
    }

    /**
     * The purpose of this is strictly for optimizing how Tridy handles very large trees.
     * Without it, all modules in the database will be tested needlessly by a context expression.
     */
    _getMaximumDepth(test) {
        if (common.isEmpty(test)) {
            return 0;
        }
        
        if (this._isExpressionTreeLeaf(test)) {
            return 1;
        }
        
        let a_lvl = 0;
        if (test.a !== undefined) {
            a_lvl = this._getMaximumDepth(test.a);
        }
        if (a_lvl === null) {
            return a_lvl;
        }

        let b_lvl = 0;
        if (test.b !== undefined) {
            b_lvl = this._getMaximumDepth(test.b);
        }
        if (b_lvl === null) {
            return b_lvl;
        }

        let c_lvl = 0;
        if (test.c !== undefined) {
            c_lvl = this._getMaximumDepth(test.c);
        }
        if (c_lvl === null) {
            return c_lvl;
        }

        let lvl = Math.max(a_lvl, b_lvl, c_lvl);
        if (test.op === '//') {
            return null;
        }
        if (test.op === '/') {
            return lvl + 1;
        }
        return lvl;
    }

    _postOperation(command, stats) {
        switch (command) {
            case '_load':
                this._saved = [ ];
                break;
            case 'nop':
                this._output.modules.push({ content: stats });
                break;
            default:
                switch (common.global.log_level) {
                    case 'verbose':
                    case 'debug':
                    case 'silly':
                        this._output.modules.push({ content: stats });
                }
                break;
        }
    }

    async _parseStatement() {
        const context    = this._astree.enterGetAndLeave('context');
        let   expression = context ? context.expression     : { };
        let   limit      = context ? context.limit  ?? null : null;
        const offset     = context ? context.offset ?? 0    : 0;
        const repeat     = context ? context.repeat ?? 0    : 0;

        if (!common.isEmpty(expression)) {
            expression = ContextParser.upgrade(expression);
        }

        limit = (limit === null) ? null : limit + offset;

        const command = this._astree.enterGetAndLeave('operation');

        const functions = this._astree.enterGetAndLeave('functions');

        let template = null;
        switch (command) {
            case '_save':
                this._saved = [ ];
                break;
            case '_load':
            case 'print':
            case 'delete':
            case 'multi':
            case 'import':
            case 'nop':
                break;
            default:
                template = this._createModuleTemplate();
        }

        const start_lvl = this._getStartingLevel();
        const level     = { start: start_lvl, current: start_lvl };

        const max_depth = this._getMaximumDepth(expression);
        level.max       = (max_depth === null) ? null : start_lvl + max_depth;

        const stats = {
            attempts:  0,
            successes: 0,
            indeces:   [ ]
        };

        const traverse = {
            count:     0,
            limit:     limit,
            offset:    offset,
            template:  template,
            functions: functions,
            stats:     stats
        };

        for (let i = 0; i <= repeat; i++) {
            await this._traverseModule(expression, command, level, this._random.prng(), traverse);
            if ((limit !== null) && (traverse.count >= limit)) {
                break;
            }
        }

        this._postOperation(command, stats);
    }

    async _parse() {
        await this._astree.traverseAsync(this._parseStatement.bind(this));
    }

    async compose(input, opts = { }) {
        this._astree = new StateTree(input);

        this._output = { alias: this._alias, modules: [ ] };

        await this._parse();

        return this._output;
    }
}
