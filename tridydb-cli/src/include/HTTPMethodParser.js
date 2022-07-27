import { StateTree } from '../utility/StateTree.js';

export class HTTPMethodParser {
    static _parseRecursive(input, methods) {
        const operation = input.enterGetAndLeave('operation');
        switch (operation) {
            case 'multi':
            case 'import':
                input.traverse(() => {
                    this._parseRecursive(input, methods);
                });
                break;
            case 'print':
            case '_save':
            case 'nop':
                methods.get = true;
                break;
            case 'compose':
            case '_load':
                methods.post = true;
                break;
            case 'overwrite':
            case 'edit':
            case 'tag':
            case 'untag':
                methods.put = true;
                break;
            case 'delete':
                methods.delete = true;
                break;
            default:
                /**
                 * No security reason why it's methods.put and not methods.get.
                 * However, anything "else" (an unknown operation) suggests an badly-formatted tree.
                 * In other words, it's probably better not to waste CPU cycles on it, if it can be avoided.
                 */
                methods.put = true;
                break;
        }
    }
    
    static parse(input) {
        input = new StateTree(input);
    
        /**
         * The "methods" structure is intentionally used in two different ways here.
         * The first is for determining what methods an abstract syntax tree would invoke.
         * In other words, what permissions will be required.
         * 
         * GET (lowest permissions) is only capable of reading and not writing.
         * POST operations have the ability to write, but when successful are never "idempotent" (only creates new modules).
         * PUT (highest permissions) can do idempotent writes, or in other words can do everything, so it's also a catch-all for every operation.
         * DELETE operations have the ability to write, but obviously can only delete and not create new modules.
         */
    
        const methods = {
            get:    false,
            post:   false,
            put:    false,
            delete: false
        };
    
        input.traverse(() => {
            this._parseRecursive(input, methods);
        });
        
        /**
         * In this part, the "methods" structure is used for determining what HTTP methods can fulfill those permissions.
         * In other words, what are the common denominators.
         * 
         * GET fully overlaps with all other operations, meaning every method can perform reads.
         * PUT, on the other hand, overlaps only with itself, so if PUT was set true previously, the PUT method *will* be required.
         * POST and DELETE are mutually exclusive, so if a tree has both, the PUT method will also be required.
         * In some situations, a delete plus a non-idempotent write is equivalent to an idempotent write.
         */
        if ((methods.put === true) || ((methods.post === true) && (methods.delete === true))) {
            methods.get    = false;
            methods.post   = false;
            methods.put    = true;
            methods.delete = false;
        } else if (methods.delete === true) {
            methods.get    = false;
            methods.post   = false;
            methods.put    = true;
            methods.delete = true;
        } else if (methods.post === true) {
            methods.get    = false;
            methods.post   = true;
            methods.put    = true;
            methods.delete = false;
        } else if (methods.get === true) {
            methods.get    = true;
            methods.post   = true;
            methods.put    = true;
            methods.delete = true;
        }
    
        return methods;
    }

    static getLowestPermission(input) {
        const methods = this.parse(input);

        if (methods.get === true) {
            return 'get';
        }
        if (methods.post === true) {
            return 'post';
        }
        if (methods.delete === true) {
            return 'delete';
        }
        if (methods.put === true) {
            return 'put';
        }
    }
}