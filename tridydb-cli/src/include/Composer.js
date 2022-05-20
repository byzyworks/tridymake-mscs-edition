import uuid from 'uuid-random';

import { compressor } from './Compressor.js';
import { StateTree }  from './StateTree.js';

import * as common     from '../utility/common.js';
import { SyntaxError } from '../utility/error.js';
import { Stack }       from '../utility/Stack.js';

class Composer {
    constructor() {
        this._target = new Stack();
    }
    
    _createModule() {
        const module = new StateTree(null, common.global.alias);

        this._astree.enterPos('raw');
        if (!this._astree.isPosUndefined()) {
            module.setPosValue(this._astree.getPosValue());
        }
        this._astree.leavePos();

        this._astree.enterPos('definition');
        if (!this._astree.isPosUndefined()) {
            // The order of assignment below affects the final output.
            // Don't switch it up unless you're prepared to change the expected test case outputs, too.

            module.enterPos(common.global.alias.type);
            this._astree.enterPos(common.global.defaults.alias.type);
            this._astree.copyPosValue(module);
            this._astree.leavePos();
            module.leavePos();

            module.enterPos(common.global.alias.tags);
            this._astree.enterPos(common.global.defaults.alias.tags);
            this._astree.copyPosValue(module);
            this._astree.leavePos();
            module.leavePos();

            module.enterPos(common.global.alias.state);
            this._astree.enterPos(common.global.defaults.alias.state);
            this._astree.copyPosValue(module);
            this._astree.leavePos();
            module.leavePos();

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
        return (typeof obj === 'string');
    }

    _matchingTag(test, tested, lvl) {
        const answers = { };

        switch (test) {
            case '*': // from @any
                answers.value = true;
                break;
            case '~': // from @root
                answers.value = lvl === 0;
                break;
            case '%': // from @leaf
                answers.value = common.isEmpty(this._target.peek().enterGetAndLeave(common.global.alias.nested));
                break;
            case '?': // from @random
                answers.value = (Math.random() >= 0.5);
                break;
            default: // assumed to be a regular old tag
                answers.value = false;
                for (const tag of tested[lvl]) {
                    if (test == tag) {
                        answers.value = true;
                        break;
                    }
                }
                break;
        }

        /**
         * Important line here: We want to verify, in addition to if an expression matches, that the expression also reaches the last element of the current module's context.
         * If whether it reaches the last element or not isn't verified, then the expression becomes true not only for the module, but also all of its sub-modules.
         * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
         * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
         * Thus, we need to see that there would not be additional levels of nesting left unverified for the current context before the expression is assumed correct.
         * The value is computed similarly to the expression's answer itself, and only combined at the very end.
         * That's because, for some sub-expressions (like the operand on the parent side of @child), the value of it isn't important or used.
         * Likewise, it shouldn't be mixed in with the actual answer immediately, if it ever does get mixed in.
         */
        answers.ended = lvl === (tested.length - 1);

        return answers;
    }

    _testNot(a, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        return {
            value: !a_answers.value,
            ended: a_answers.ended
        };
    }

    _testAnd(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);
        
        let b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            b_answers = this._matchingExpression(b, tested, lvl);
        }

        return {
            value: a_answers.value && b_answers.value,
            ended: a_answers.ended && b_answers.ended
        };
    }

    _testXor(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);
        const b_answers = this._matchingExpression(b, tested, lvl);

        return {
            value: (!a_answers.value && b_answers.value) || (a_answers.value && !b_answers.value),
            ended: a_answers.value ? a_answers.ended : b_answers.ended
        };
    }

    _testOr(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        let b_answers = { value: false, ended: true };
        if ((a_answers.value === false) || (a_answers.ended === false)) {
            b_answers = this._matchingExpression(b, tested, lvl);
        }

        // The value of "ended" should generally correspond to the same value causing an expression to be true, and which one it is matters with @or.
        // Don't ask why this particular configuration seems to work...
        return {
            value: a_answers.value || b_answers.value,
            ended: (a_answers.value && a_answers.ended) || (b_answers.value && b_answers.ended) || a_answers.ended || b_answers.ended
        };
    }

    _testParentMain(b, tested, lvl, opts = { }) {
        opts.recurse = opts.recurse ?? false;

        const target = this._target.peek();

        const child_subcontext = [ ];
        
        // Needed if @parent/@ascend is used with @to/@toward and is in the LHS of the @to/@toward expression.
        // The target's context needs to be aligned with that of the parent that's supposed to be evaluated.
        const parent_diff = tested.length - lvl;
        for (let i = 0; i < parent_diff; i++) {
            child_subcontext.push(target.leavePos());
            child_subcontext.push(target.leavePos());
        }

        let answers = { value: false, ended: true };

        target.enterPos(common.global.alias.nested);
        if (!target.isPosEmpty()) {
            target.enterPos(0);
            while (!target.isPosUndefined()) {
                tested  = this._getContext();
                answers = this._matchingExpression(b, tested, lvl);
                if (opts.recurse && (answers.value === false)) {
                    answers = this._testParentMain(b, tested, lvl + 1, opts);
                }
                if (answers.value === true) {
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

        return answers;
    }

    _testParent(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        let b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            b_answers = this._testParentMain(b, tested, lvl + 1, { recurse: false });
        }

        return {
            value: a_answers.value && b_answers.value,
            ended: a_answers.ended // We're only affecting the parent module.
        };
    }

    _testAscend(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        let b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            b_answers = this._testParentMain(b, tested, lvl + 1, { recurse: true });
        }

        return {
            value: a_answers.value && b_answers.value,
            ended: a_answers.ended // We're only affecting the parent module.
        };
    }

    _testChild(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        let b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            b_answers = this._matchingExpression(b, tested, lvl - 1);
        }

        return {
            value: a_answers.value && b_answers.value,
            ended: a_answers.ended // We're only affecting the child module.
        };
    }

    _testDescend(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        let b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            lvl--;
            while ((b_answers.value === false) && (lvl >= 0)) {
                b_answers = this._matchingExpression(b, tested, lvl);
                lvl--;
            }
        }

        return {
            value: a_answers.value && b_answers.value,
            ended: a_answers.ended // We're only affecting the child module.
        };
    }

    _testTo(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        let b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            b_answers = this._matchingExpression(b, tested, lvl + 1);
        }

        return {
            value: a_answers.value && b_answers.value,
            ended: b_answers.ended // We're only affecting the child module, but it's to the right of the operator now.
        };
    }

    _testToward(a, b, tested, lvl) {
        const a_answers = this._matchingExpression(a, tested, lvl);

        let b_answers = { value: false, ended: true };
        if ((a_answers.value === true) || (a_answers.ended === false)) {
            lvl++;
            while (((b_answers.value === false) || (b_answers.ended === false)) && (lvl < tested.length)) {
                b_answers = this._matchingExpression(b, tested, lvl);
                lvl++;
            }
        }

        return {
            value: a_answers.value && b_answers.value,
            ended: b_answers.ended // We're only affecting the child module, but it's to the right of the operator now.
        };
    }

    _matchingExpression(test, tested, lvl) {
        let answers;

        if (common.isEmpty(test)) {
            answers       = { };
            answers.value = common.isEmpty(tested);
            answers.ended = answers.value;
        } else if (common.isEmpty(tested) || (lvl < 0) || (lvl >= tested.length)) {
            answers       = { };
            answers.value = false;
            answers.ended = true;
        } else if (this._isTag(test)) {
            answers = this._matchingTag(test, tested, lvl);
        } else {
            switch (test.op) {
                case '!':
                    answers = this._testNot(test.a, tested, lvl);
                    break;
                case '&':
                    answers = this._testAnd(test.a, test.b, tested, lvl);
                    break;
                case '^':
                    answers = this._testXor(test.a, test.b, tested, lvl);
                    break;
                case '|':
                    answers = this._testOr(test.a, test.b, tested, lvl);
                    break;
                case '>':
                    answers = this._testParent(test.a, test.b, tested, lvl);
                    break;
                case '>>':
                    answers = this._testAscend(test.a, test.b, tested, lvl);
                    break;
                case '<':
                    answers = this._testChild(test.a, test.b, tested, lvl);
                    break;
                case '<<':
                    answers = this._testDescend(test.a, test.b, tested, lvl);
                    break;
                case '/':
                    answers = this._testTo(test.a, test.b, tested, lvl);
                    break;
                case '//':
                    answers = this._testToward(test.a, test.b, tested, lvl);
                    break;
            }
        }

        return answers;
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

        const copy = compressor.compressModule(target.getPosValue(), this._astree.enterGetAndLeave(['compression']));
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

        const answers = this._matchingExpression(test, this._getContext(), 0);

        let   matched      = answers.value && answers.ended;
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

    _parseStatement() {
        const context    = this._astree.enterGetAndLeave('context');
        const expression = context ? context.expression : [ ];
        const greedy     = context ? context.greedy ?? false : false;

        const command = this._astree.enterGetAndLeave('operation');

        let template = null;
        if (command !== 'print') {
            template = this._createModule();
        }

        this._traverseModule(expression, command, 0, this._getMaximumDepth(expression), { template: template, greedy: greedy });
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

export const composer = new Composer();
