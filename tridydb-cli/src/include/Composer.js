import seedrandom from 'seedrandom';
import shuffle    from 'knuth-shuffle-seeded';
import uuid       from 'uuid-random';

import { Compressor } from './Compressor.js';
import { StateTree }  from './StateTree.js';
import { Tag }        from './Tag.js';
import { Token }      from './Token.js';

import * as common     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Stack }       from '../utility/Stack.js';

export class Composer {
    constructor() {
        this._target = new Stack();

        this.setRandomSeed();
    }

    getRandomSeed() {
        return this._random.seed;
    }

    setRandomSeed(seed) {
        this._random       = { };
        this._random.seed  = seed ?? seedrandom().int32();
        this._random.prng  = new seedrandom(''.concat(this._random.seed), { entropy: false });
    }

    _getModuleShuffledIndex(lvl, index, random) {
        const last_index  = index.real[lvl]   ?? 0;
        const last_extent = index.extent[lvl] ?? 0;

        // Using the query random plus the parent's index ensures all children of the same parent use the same seed.
        let suffix = index.real.slice(0, lvl).join(':');
        if (!common.isEmpty(suffix)) {
            suffix = ':' + suffix;
        }
        const seed = random + suffix;

        const shuffled = shuffle([...Array(last_extent).keys()], seed);

        return shuffled[last_index] ?? 0;
    }

    _matchingTagValue(test, lvl, index, random) {
        // Note the variables below all have a minimum value of 0 (inclusive).
        // This does not include tags, which can store negative values.
        switch (test.val) {
            case '$D':
                return lvl;
            case '$C':
                return index.extent[lvl + 1] ?? 0;
            case '$I':
                return index.real[lvl] ?? 0;
            case '$N':
                return (index.extent[lvl] ?? 1) - 1;
            case '$Q':
                return random;
            case '$S':
                return this._getModuleShuffledIndex(lvl, index, random);
            case '$R':
                return this._random.prng();
            default:
                for (const tag of index.context[lvl]) {
                    if (test.val === Tag.getIdentifier(tag)) {
                        return Tag.getValue(tag);
                    }
                }
                return null;
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

    _matchingNumberExpression(a, b, op, lvl, index, random, opts = { }) {
        let answer = this._matchingTagValue(a, lvl, index, random);
        switch (op) {
            case '$==':
                answer = (answer === null) ? false : (answer === Number(b.val));
                break;
            case '$!=':
                answer = (answer === null) ? true : (answer !== Number(b.val));
                break;
            case '$<':
                answer = (answer === null) ? false : (answer < Number(b.val));
                break;
            case '$<=':
                answer = (answer === null) ? false : (answer <= Number(b.val));
                break;
            case '$>':
                answer = (answer === null) ? false : (answer > Number(b.val));
                break;
            case '$>=':
                answer = (answer === null) ? false : (answer >= Number(b.val));
                break;
        }

        return this._verifyMatching(answer, a, lvl, index, opts);
    }

    _testLookaheadRecursive(b, lvl, index, random, recursive, opts = { }) {
        const target = this._target.peek();

        const child_subcontext = [ ];
        
        // Needed if @parent/@ascend is used with @to/@toward and is in the LHS of the @to/@toward expression.
        // The target's context needs to be aligned with that of the parent that's supposed to be evaluated.
        const parent_diff = index.context.length - lvl;
        for (let i = 0; i < parent_diff; i++) {
            child_subcontext.push(target.leavePos());
            child_subcontext.push(target.leavePos());
        }

        let b_index;
        let b_random;

        let answer = false;

        target.enterPos(this._alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosUndefined()) {
                b_index = this._getModuleIndex();

                answer = this._matchingExpression(b, lvl, b_index, random, opts);

                if (recursive && (answer === false)) {
                    lvl++;

                    answer = this._testLookaheadRecursive(b, lvl, b_index, random, recursive, opts);
                }
                if (answer === true) {
                    break;
                }

                target.nextItem();
            }
            target.leavePos();
        }
        target.leavePos();

        while (child_subcontext.length > 0) {
            target.enterPos(child_subcontext.pop());
        }

        return answer;
    }

    _testLookahead(a, b, lvl, index, random, recursive, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, lvl, index, random, a_opts);

        const b_opts        = { recurse: true, tracked: new Set() };
        let   b_answer_part = false;
        let   b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl + 1;

                b_answer_part = this._testLookaheadRecursive(b, lvl, index, random, recursive, b_opts);

                if ((b_answer_part === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(cand_lvl);
                }

                b_answer ||= b_answer_part;
            }
        }

        return a_answer && b_answer;
    }

    _testLookbehind(a, b, lvl, index, random, recursive, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, lvl, index, random, a_opts);

        let   b_random;
        const b_opts        = { tracked: new Set() };
        let   b_answer_part = false;
        let   b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl - 1;

                if (recursive) {
                    while ((b_answer_part === false) && (lvl >= 0)) {
                        b_answer_part = this._matchingExpression(b, lvl, index, random, b_opts);
    
                        lvl--;
                    }
                } else {
                    b_answer_part = this._matchingExpression(b, lvl, index, random, b_opts);
                }
                
                if ((b_answer_part === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(cand_lvl);
                }

                b_answer ||= b_answer_part;
            }
        }

        return a_answer && b_answer;
    }

    _testTransitive(a, b, lvl, index, random, recursive, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, lvl, index, random, a_opts);

        let b_random;
        let b_answer_part = false;
        let b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl + 1;

                if (recursive) {
                    while ((b_answer_part === false) && (lvl < index.context.length)) {
                        b_answer_part = this._matchingExpression(b, lvl, index, random, opts);

                        lvl++;
                    }
                    b_answer ||= b_answer_part;
                } else {
                    b_answer ||= this._matchingExpression(b, lvl, index, random, opts);
                }
            }
        }

        return a_answer && b_answer;
    }

    _isExpressionTreeLeaf(obj) {
        return common.isDictionary(obj) && (obj.val !== undefined);
    }

    _matchingExpression(test, lvl, index, random, opts = { }) {
        if (common.isEmpty(test)) {
            return common.isEmpty(index.context);
        } else if (common.isEmpty(index.context) || (lvl < 0) || (lvl >= index.context.length)) {
            return false;
        } else if (this._isExpressionTreeLeaf(test)) {
            return this._matchingTag(test, lvl, index, random, opts);
        } else if (test.op[0] === '$') {
            return this._matchingNumberExpression(test.a, test.b, test.op, lvl, index, random, opts);
        } else {
            switch (test.op) {
                case '!':
                    return !this._matchingExpression(test.a, lvl, index, random, opts);
                case '&':
                    return this._matchingExpression(test.a, lvl, index, random, opts) && this._matchingExpression(test.b, lvl, index, random, opts);
                case '^':
                    const a = this._matchingExpression(test.a, lvl, index, random, opts);
                    const b = this._matchingExpression(test.b, lvl, index, random, opts);
                    return (a & !b) || (b & !a);
                case '|':
                    return this._matchingExpression(test.a, lvl, index, random, opts) || this._matchingExpression(test.b, lvl, index, random, opts);
                case '>':
                    return this._testLookahead(test.a, test.b, lvl, index, random, false, opts);
                case '>>':
                    return this._testLookahead(test.a, test.b, lvl, index, random, true, opts);
                case '<':
                    return this._testLookbehind(test.a, test.b, lvl, index, random, false, opts);
                case '<<':
                    return this._testLookbehind(test.a, test.b, lvl, index, random, true, opts);
                case '/':
                    return this._testTransitive(test.a, test.b, lvl, index, random, false, opts);
                case '//':
                    return this._testTransitive(test.a, test.b, lvl, index, random, true, opts);
                case '?':
                    return this._matchingExpression(test.a, lvl, index, random, opts) ? this._matchingExpression(test.b, lvl, index, random, opts) : this._matchingExpression(test.c, lvl, index, random, opts);
            }
        }
    }

    _createModule(module = null) {
        if (module === null) {
            module = new StateTree(module, this._alias);
        }

        this._astree.enterPos('raw');
        if (!this._astree.isPosUndefined()) {
            module.setPosValue(this._astree.getPosValue());
        }
        this._astree.leavePos();

        this._astree.enterPos('definition');
        if (!this._astree.isPosUndefined()) {
            // The order of assignment below affects the final output.
            // Don't switch it up unless you're prepared to change the expected test case outputs, too.

            this._astree.enterPos(common.global.defaults.alias.type);
            if (!this._astree.isPosUndefined()) {
                module.enterPos(this._alias.type);
                this._astree.copyPosValue(module);
                module.leavePos();
            }
            this._astree.leavePos();

            this._astree.enterPos(common.global.defaults.alias.tags);
            if (!this._astree.isPosUndefined()) {
                module.enterPos(this._alias.tags);
                this._astree.copyPosValue(module);
                module.leavePos();
            }
            this._astree.leavePos();

            this._astree.enterPos(common.global.defaults.alias.state);
            if (!this._astree.isPosUndefined()) {
                module.enterPos(this._alias.state);
                this._astree.copyPosValue(module);
                module.leavePos();
            }
            this._astree.leavePos();

            this._astree.enterPos(common.global.defaults.alias.nested);
            if (!this._astree.isPosEmpty()) {
                this._astree.leavePos();

                this._target.push(module);
                this._parse();
                this._target.pop();
            } else {
                this._astree.leavePos();
            }
        }
        this._astree.leavePos();

        return module.getRaw();
    }

    _uniqueCopy(template) {
        const copy = common.deepCopy(template);

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
        const target = this._target.peek();

        target.setPosValue(template);
    }

    _composeModule(template) {
        const target = this._target.peek();

        if (!common.isDictionary(target.getPosValue())) {
            throw new SyntaxError(`Tried to append a new submodule to an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        target.enterPutAndLeave(this._alias.nested, template);
    }

    _printModule() {
        const target = this._target.peek();

        const copy = (new Compressor()).compressModule(target.getPosValue(), this._astree.enterGetAndLeave(['compression']));
        if (copy === undefined) {
            return;
        }

        this._output.push(copy);
    }

    _deleteModule() {
        const target = this._target.peek();

        const spliced = target.getTopPos();
        if (spliced === null) {
            // then this module is the root module.
            target.setPosValue({ });
        } else {
            target.leavePos();
            target.getPosValue().splice(spliced, 1);
            
            if ((spliced === 0) && target.isPosEmpty()) {
                target.setPosValue(undefined);
            }

            /**
             * When target.nextItem() is called, the negative index will auto-reset to 0.
             * The negative index is used so the composer knows to retry 0 after the array has shifted.
             * This is the easiest way to tell that the tree array has already shifted back because of a @del statement.
             */
            target.enterPos(spliced - 1);
        }
    }

    _editModulePart(target, template, nulled, key) {
        if ((template[this._alias[key]] !== undefined) || (common.isDictionary(nulled) && (nulled[common.global.defaults.alias[key]] === true))) {
            target.enterSetAndLeave(this._alias[key], template[this._alias[key]]);
        }
    }

    _editModule(template) {
        const target = this._target.peek();

        if (!common.isDictionary(target.getPosValue())) {
            throw new SyntaxError(`Tried to edit an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        const nulled = this._astree.enterGetAndLeave(['definition', 'nulled']);

        this._editModulePart(target, template, nulled, 'type');
        this._editModulePart(target, template, nulled, 'tags');
        this._editModulePart(target, template, nulled, 'state');
        this._editModulePart(target, template, nulled, 'nested');
    }

    _tagModule(template) {
        const target = this._target.peek();

        if (!common.isDictionary(target.getPosValue())) {
            throw new SyntaxError(`Tried to tag an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        target.enterPos(this._alias.tags);

        let tags = target.getPosValue();

        if (!common.isArray(tags)) {
            if (tags !== undefined) {
                target.leavePos();
                throw new SyntaxError(`Tried to tag an improperly-formatted root module (was @set with raw input used to change it?).`);
            }
            tags = [ ];
            target.setPosValue(tags);
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
                    target.putPosValue(added);
                }
            }
        }

        target.leavePos();
    }

    _untagModule(template) {
        const target = this._target.peek();

        if (!common.isDictionary(target.getPosValue())) {
            throw new SyntaxError(`Tried to untag an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        target.enterPos(this._alias.tags);

        const tags = target.getPosValue();

        if (!common.isArray(tags)) {
            target.leavePos();
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

        if (target.isPosEmpty()) {
            target.setPosValue(undefined);
        }

        target.leavePos();
    }

    _multiModule() {
        let target = this._target.peek();

        let template;
        template = new StateTree(target.getPosValue(), this._alias);
        template = this._createModule(template);

        target.setPosValue(template);
    }

    _operateModule(command, opts = { }) {
        opts.template = opts.template ?? null;
        if (opts.template !== null) {
            opts.template = this._uniqueCopy(opts.template);
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
            case 'multi':
                this._multiModule();
                break;
        }
    }

    _getModuleIndex() {
        const index = {
            real:    [ ],
            extent:  [ ],
            context: [ ]
        }

        const target = this._target.peek();
        const raw    = target.getFullPos();
        let   ptr    = target.getRaw();

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

    _traverseModule(test, command, lvl, max_lvl, random, opts = { }) {
        opts.template = opts.template ?? null;
        opts.greedy   = opts.greedy   ?? false;

        const index = this._getModuleIndex();

        const answer = this._matchingExpression(test, 0, index, random);

        let   matched      = answer;
        const matched_this = matched;
        if (((max_lvl === null) || (lvl < max_lvl)) && (!opts.greedy || !matched)) {
            const target = this._target.peek();
            target.enterPos(this._alias.nested);
            if (!target.isPosEmpty()) {
                target.enterPos(0);
                while (!target.isPosUndefined()) {
                    matched = this._traverseModule(test, command, lvl + 1, max_lvl, random, opts);
                    if (opts.greedy && matched) {
                        break;
                    }
                    target.nextItem();
                }
                target.leavePos();
            }
            target.leavePos();
        }

        if (matched_this) {
            this._operateModule(command, { template: opts.template });
        }

        return matched;
    }

    _createExpressionPositionHelpersRecursive(test, end = null) {
        const token = new Token('ctxt_op', test.op);

        if (end === null) {
            if (token.isNestedOpContextToken()) {
                let evaluated = 'a';
                let affected  = 'b';
                if (token.isNonTransitiveNestedOpContextToken()) {
                    evaluated = 'b';
                    affected  = 'a';
                }
    
                if (common.isDictionary(test[evaluated])) {
                    this._createExpressionPositionHelpersRecursive(test[evaluated], false);
                } else {
                    test[evaluated] = { val: test[evaluated], end: false };
                }

                if (common.isDictionary(test[affected])) {
                    this._createExpressionPositionHelpersRecursive(test[affected], null);
                } else {
                    test[affected] = { val: test[affected], end: true };
                }
            } else {
                if (common.isDictionary(test.a)) {
                    this._createExpressionPositionHelpersRecursive(test.a, null);
                } else {
                    test.a = { val: test.a, end: true };
                }

                if (!token.isUnaryOpContextToken()) {
                    if (common.isDictionary(test.b)) {
                        this._createExpressionPositionHelpersRecursive(test.b, null);
                    } else {
                        test.b = { val: test.b, end: true };
                    }

                    if (token.isTernaryFirstOpContextToken()) {
                        if (common.isDictionary(test.c)) {
                            this._createExpressionPositionHelpersRecursive(test.c, null);
                        } else {
                            test.c = { val: test.c, end: true };
                        }
                    }
                }
            }
        } else {
            if (common.isDictionary(test.a)) {
                this._createExpressionPositionHelpersRecursive(test.a, end);
            } else {
                test.a = { val: test.a, end: end };
            }
            
            if (!token.isUnaryOpContextToken()) {
                if (common.isDictionary(test.b)) {
                    this._createExpressionPositionHelpersRecursive(test.b, end);
                } else {
                    test.b = { val: test.b, end: end };
                }

                if (token.isTernaryFirstOpContextToken()) {
                    if (common.isDictionary(test.c)) {
                        this._createExpressionPositionHelpersRecursive(test.c, end);
                    } else {
                        test.c = { val: test.c, end: end };
                    }
                }
            }
        }
    }

    /**
     * Adding "position helpers" to the expression's terminals is to determine which sub-expressions are "intermediate" (like a in "a/b") of "final" (like b in "a/b").
     * We want to verify, in addition to if an expression matches, that the expression also reaches the last element of the current module's context.
     * If whether it reaches the last element or not isn't verified, then the expression becomes true not only for the module, but also all of its sub-modules.
     * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
     * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
     * Fortunately, it's easy from the expression to determine if a terminal is final or not, based on it containing sub-expressions with transitive operators.
     * It can be made a requirement specifically that "final" terminals are evaluated at a last level of the context being evaluated, and not before or after.
     */
    _createExpressionPositionHelpers(test) {
        if (!common.isDictionary(test)) {
            return { val: test, end: true };
        }

        if (!common.isEmpty(test)) {
            this._createExpressionPositionHelpersRecursive(test, null);
        }

        return test;
    }

    /**
     * The purpose of this is strictly for optimizing how Tridy handles very large trees.
     * Without it, all modules in the database will be tested needlessly by a context expression.
     */
    _getMaximumLevel(test) {
        if (common.isEmpty(test)) {
            return 0;
        }
        
        if (this._isExpressionTreeLeaf(test)) {
            return 1;
        }
        
        let a_lvl = 0;
        if (test.a !== undefined) {
            a_lvl = this._getMaximumLevel(test.a);
        }
        if (a_lvl === null) {
            return a_lvl;
        }

        let b_lvl = 0;
        if (test.b !== undefined) {
            b_lvl = this._getMaximumLevel(test.b);
        }
        if (b_lvl === null) {
            return b_lvl;
        }

        let c_lvl = 0;
        if (test.c !== undefined) {
            c_lvl = this._getMaximumLevel(test.c);
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

    _parseStatement() {
        const context    = this._astree.enterGetAndLeave('context');
        let   expression = context ? context.expression : { };
        const greedy     = context ? context.greedy ?? false : false;

        if (!common.isEmpty(expression)) {
            expression = this._createExpressionPositionHelpers(expression);
        }

        const command = this._astree.enterGetAndLeave('operation');

        let template = null;
        switch (command) {
            case 'print':
            case 'delete':
            case 'multi':
                break;
            default:
                template = this._createModule();
        }

        const max_depth = this._getMaximumLevel(expression);

        this._traverseModule(expression, command, 0, max_depth, this._random.prng(), { template: template, greedy: greedy });
    }

    _parse() {
        this._astree.enterPos(common.global.defaults.alias.nested);
        if (!this._astree.isPosEmpty()) {
            this._astree.enterPos(0);
            while (!this._astree.isPosUndefined()) {
                this._parseStatement();

                this._astree.nextItem();
            }
            this._astree.leavePos();
        }
        this._astree.leavePos();
    }

    compose(input, alias, opts = { }) {
        this._astree = input;

        this._alias = alias;

        if (this._target.isEmpty()) {
            this._target.push(new StateTree(null, this._alias));
        }
        
        this._output = [ ];

        this._parse();

        return this._output;
    }
}
