import uuid from 'uuid-random';

import { Compressor } from './Compressor.js';
import { StateTree }  from './StateTree.js';
import { Token }      from './Token.js';

import * as common     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Stack }       from '../utility/Stack.js';

export class Composer {
    constructor() {
        this._target = new Stack();
    }
    
    _createModule(module = null) {
        if (module === null) {
            module = new StateTree(module, common.global.alias);
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
                module.enterPos(common.global.alias.type);
                this._astree.copyPosValue(module);
                module.leavePos();
            }
            this._astree.leavePos();

            this._astree.enterPos(common.global.defaults.alias.tags);
            if (!this._astree.isPosUndefined()) {
                module.enterPos(common.global.alias.tags);
                this._astree.copyPosValue(module);
                module.leavePos();
            }
            this._astree.leavePos();

            this._astree.enterPos(common.global.defaults.alias.state);
            if (!this._astree.isPosUndefined()) {
                module.enterPos(common.global.alias.state);
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

    _getContext() {
        let current = [ ];

        const target  = this._target.peek();
        const indices = target.getFullPos();
        let   ptr     = target.getRaw();
        
        /**
         * Note: the indices are how the JSON database is structured at a low level.
         * For instance, the coordinates of the first module under the root module would normally be ['tree'][0].
         * Since it's 2 indices ('tree' and 0) from the perspective of the parent module, we need to make 2 jumps each time.
         */
        for (let i = 0; i < indices.length; i += 2) {
            ptr = ptr[indices[i]][indices[i + 1]];
            if (!common.isDictionary(ptr) || common.isEmpty(ptr[common.global.alias.tags])) {
                current.push([ ]);
            } else {
                current.push(ptr[common.global.alias.tags]);
            }
        }

        return current;
    }

    _isTag(obj) {
        return common.isDictionary(obj) && (obj.val !== undefined);
    }

    _matchingTag(test, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        let answer;

        switch (test.val) {
            case '*': // from @any
                answer = true;
                break;
            case '~': // from @root
                answer = lvl === 0;
                break;
            case '%': // from @leaf
                answer = common.isEmpty(this._target.peek().enterGetAndLeave(common.global.alias.nested));
                break;
            case '?': // from @random
                answer = (Math.random() >= 0.5);
                break;
            default: // assumed to be a regular old tag
                answer = false;
                for (const tag of tested[lvl]) {
                    if (test.val == tag) {
                        answer = true;
                        break;
                    }
                }
                break;
        }

        /**
         * The output of this depends on whether the context is "intermediate" (like a in "a/b") or "final" (like b in "a/b").
         * The expression tree contains generated position helpers ("test.end") determining which one the terminal is.
         * It's required that the terminal is evaluated at the last level of the context if the terminal is final.
         * If whether it reaches the last element or not isn't verified, then the expression becomes true not only for the module, but also all of its sub-modules.
         * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
         * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
         * Otherwise, if it's intermediate, it should not matter.
         * 
         * You might think "why not just answer &&= lvl <= tested.length - 1?", and why the position helpers?
         * That's because tested.length is dynamic depending on the module being addressed.
         * If the module is a child module of a correct one, then tested.length is already larger than what the level is, so the comparison would always be true for child modules.
         * That makes the comparison, in effect, pointless.
         * The best way to determine finality appears to be from the expression tree's end, not the module's.
         */
        answer &&= !test.end || (lvl === (tested.length - 1));

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

    _testNot(a, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_answer = this._matchingExpression(a, tested, lvl, opts);

        return !a_answer;
    }

    _testAnd(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_answer = this._matchingExpression(a, tested, lvl, opts);
        
        let b_answer = false;
        if (a_answer === true) {
            b_answer = this._matchingExpression(b, tested, lvl, opts);
        }

        return a_answer && b_answer;
    }

    _testXor(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_answer = this._matchingExpression(a, tested, lvl, opts);
        const b_answer = this._matchingExpression(b, tested, lvl, opts);

        return (!a_answer && b_answer) || (a_answer && !b_answer);
    }

    _testOr(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_answer = this._matchingExpression(a, tested, lvl, opts);

        let b_answer = false;
        if (a_answer === false) {
            b_answer = this._matchingExpression(b, tested, lvl, opts);
        }

        return a_answer || b_answer;
    }

    _testParentMain(b, tested, lvl, opts = { }) {
        opts.recurse = opts.recurse ?? false;
        opts.tracked = opts.tracked ?? null;

        const target = this._target.peek();

        const child_subcontext = [ ];
        
        // Needed if @parent/@ascend is used with @to/@toward and is in the LHS of the @to/@toward expression.
        // The target's context needs to be aligned with that of the parent that's supposed to be evaluated.
        const parent_diff = tested.length - lvl;
        for (let i = 0; i < parent_diff; i++) {
            child_subcontext.push(target.leavePos());
            child_subcontext.push(target.leavePos());
        }

        let answer = false;

        target.enterPos(common.global.alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosUndefined()) {
                tested = this._getContext();
                answer = this._matchingExpression(b, tested, lvl, { tracked: opts.tracked });
                if (opts.recurse && (answer === false)) {
                    answer = this._testParentMain(b, tested, lvl + 1, opts);
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

    _testParent(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, tested, lvl, a_opts);

        const b_opts       = { recurse: false, tracked: new Set() };
        let   a_lvl_answer = false;
        let   b_answer     = false;
        if (a_answer === true) {
            for (const a_lvl of a_opts.tracked) {
                a_lvl_answer = this._testParentMain(b, tested, a_lvl + 1, b_opts);
                if ((a_lvl_answer === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(a_lvl);
                }
                b_answer ||= a_lvl_answer;
            }
        }

        return a_answer && b_answer;
    }

    _testAscend(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, tested, lvl, a_opts);

        const b_opts       = { recurse: true, tracked: new Set() };
        let   a_lvl_answer = false;
        let   b_answer     = false;
        if (a_answer === true) {
            for (const a_lvl of a_opts.tracked) {
                a_lvl_answer = this._testParentMain(b, tested, a_lvl + 1, b_opts);
                if ((a_lvl_answer === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(a_lvl);
                }
                b_answer ||= a_lvl_answer;
            }
        }

        return a_answer && b_answer;
    }

    _testChild(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, tested, lvl, a_opts);

        const b_opts       = { tracked: new Set() };
        let   a_lvl_answer = false;
        let   b_answer     = false;
        if (a_answer === true) {
            for (const a_lvl of a_opts.tracked) {
                a_lvl_answer = this._matchingExpression(b, tested, a_lvl - 1, b_opts);
                if ((a_lvl_answer === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(a_lvl);
                }
                b_answer ||= a_lvl_answer;
            }
        }

        return a_answer && b_answer;
    }

    _testDescend(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, tested, lvl, a_opts);

        const b_opts       = { tracked: new Set() };
        let   a_lvl_answer = false;
        let   b_answer     = false;
        if (a_answer === true) {
            for (let a_lvl of a_opts.tracked) {
                a_lvl--;
                while ((a_lvl_answer === false) && (a_lvl >= 0)) {
                    a_lvl_answer = this._matchingExpression(b, tested, a_lvl, b_opts);
                    a_lvl--;
                }
                if ((a_lvl_answer === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(a_lvl);
                }
                b_answer ||= a_lvl_answer;
            }
        }

        return a_answer && b_answer;
    }

    _testTo(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, tested, lvl, a_opts);

        let b_answer     = false;
        if (a_answer === true) {
            for (const a_lvl of a_opts.tracked) {
                b_answer ||= this._matchingExpression(b, tested, a_lvl + 1, opts);
            }
        }

        return a_answer && b_answer;
    }

    _testToward(a, b, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        const a_opts   = { tracked: new Set() };
        const a_answer = this._matchingExpression(a, tested, lvl, a_opts);

        let a_lvl_answer = false;
        let b_answer     = false;
        if (a_answer === true) {
            for (let a_lvl of a_opts.tracked) {
                a_lvl++;
                while ((a_lvl_answer === false) && (a_lvl < tested.length)) {
                    a_lvl_answer = this._matchingExpression(b, tested, a_lvl, opts);
                    a_lvl++;
                }
                b_answer ||= a_lvl_answer;
            }
        }

        return a_answer && b_answer;
    }

    _matchingExpression(test, tested, lvl, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        let answer;

        if (common.isEmpty(test)) {
            answer = common.isEmpty(tested);
        } else if (common.isEmpty(tested) || (lvl < 0) || (lvl >= tested.length)) {
            answer = false;
        } else if (this._isTag(test)) {
            answer = this._matchingTag(test, tested, lvl, opts);
        } else {
            switch (test.op) {
                case '!':
                    answer = this._testNot(test.a, tested, lvl, opts);
                    break;
                case '&':
                    answer = this._testAnd(test.a, test.b, tested, lvl, opts);
                    break;
                case '^':
                    answer = this._testXor(test.a, test.b, tested, lvl, opts);
                    break;
                case '|':
                    answer = this._testOr(test.a, test.b, tested, lvl, opts);
                    break;
                case '>':
                    answer = this._testParent(test.a, test.b, tested, lvl, opts);
                    break;
                case '>>':
                    answer = this._testAscend(test.a, test.b, tested, lvl, opts);
                    break;
                case '<':
                    answer = this._testChild(test.a, test.b, tested, lvl, opts);
                    break;
                case '<<':
                    answer = this._testDescend(test.a, test.b, tested, lvl, opts);
                    break;
                case '/':
                    answer = this._testTo(test.a, test.b, tested, lvl, opts);
                    break;
                case '//':
                    answer = this._testToward(test.a, test.b, tested, lvl, opts);
                    break;
            }
        }

        return answer;
    }

    _uniqueCopy(template) {
        const copy = common.deepCopy(template);

        // A UUID needs to be unique for every copy of a module, even if generated in the same statement.
        if (common.isDictionary(template)) {
            const tags = copy[common.global.alias.tags];
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

        target.enterPutAndLeave(common.global.alias.nested, template);
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
        if ((template[common.global.alias[key]] !== undefined) || (common.isDictionary(nulled) && (nulled[common.global.defaults.alias[key]] === true))) {
            target.enterSetAndLeave(common.global.alias[key], template[common.global.alias[key]]);
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

        target.enterPos(common.global.alias.tags);

        let tags = target.getPosValue();

        if (!common.isArray(tags)) {
            if (tags !== undefined) {
                target.leavePos();
                throw new SyntaxError(`Tried to tag an improperly-formatted root module (was @set with raw input used to change it?).`);
            }
            tags = [ ];
            target.setPosValue(tags);
        }

        if (common.isArray(template[common.global.alias.tags])) {
            const tagslen = tags.length; // Because the length of the tags array changes as tags are added, and the syntax parser already does a duplicate check.

            let duplicate;
            for (const added of template[common.global.alias.tags]) {
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

        target.enterPos(common.global.alias.tags);

        const tags = target.getPosValue();

        if (!common.isArray(tags)) {
            target.leavePos();
            throw new SyntaxError(`Tried to untag an improperly-formatted root module (was @set with raw input used to change it?).`);
        }

        if (common.isArray(template[common.global.alias.tags])) {
            for (const removed of template[common.global.alias.tags]) {
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
        template = new StateTree(target.getPosValue(), common.global.alias);
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

    /**
     * The purpose of this is strictly for optimizing how Tridy handles very large trees.
     * Without it, all modules in the database will be tested needlessly by a context expression.
     */
    _getMaximumDepth(test) {
        if (common.isEmpty(test)) {
            return 0;
        }
        
        if (this._isTag(test)) {
            return 1;
        }
        
        let a_depth = 0;
        if (test.a !== undefined) {
            a_depth = this._getMaximumDepth(test.a);
        }
        if (a_depth === null) {
            return a_depth;
        }

        let b_depth = 0;
        if (test.b !== undefined) {
            b_depth = this._getMaximumDepth(test.b);
        }
        if (b_depth === null) {
            return b_depth;
        }

        let depth = (a_depth > b_depth) ? a_depth : b_depth;
        if (test.op === '//') {
            return null;
        }
        if (test.op === '/') {
            return depth + 1;
        }
        return depth;
    }

    _traverseModule(test, command, depth, max_depth, opts = { }) {
        opts.template = opts.template ?? null;
        opts.greedy   = opts.greedy   ?? false;

        const context = this._getContext();

        const answer = this._matchingExpression(test, context, 0);

        let   matched      = answer;
        const matched_this = matched;
        if (((max_depth === null) || (depth < max_depth)) && (!opts.greedy || !matched)) {
            const target = this._target.peek();
            target.enterPos(common.global.alias.nested);
            if (!target.isPosEmpty()) {
                target.enterPos(0);
                while (!target.isPosUndefined()) {
                    matched = this._traverseModule(test, command, depth + 1, max_depth, opts);
                    if (opts.greedy && matched) {
                        break;
                    } else {
                        target.nextItem();
                    }
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
        const token = new Token('o', test.op);

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

        const max_depth = this._getMaximumDepth(expression);

        this._traverseModule(expression, command, 0, max_depth, { template: template, greedy: greedy });
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

    compose(input, opts = { }) {
        this._astree = input;

        if (this._target.isEmpty()) {
            this._target.push(new StateTree(null, common.global.alias));
        }
        
        this._output = [ ];

        this._parse();

        return this._output;
    }
}
