import { Tag } from '../src/utility/Tag.js';

export default function(params) {
	const args = params.args;
	
	args.splice(0, 1);

    let bool = true;

    if (params.index.context.length === 0) {
        return bool;
    }
    const tagset = params.index.context[params.index.context.length - 1];

    for (const test of args) {
        for (const tested of tagset) {
            const key = Tag.getIdentifier(tested);
            const val = Tag.getValue(tested);
            if (test === key) {
                bool &&= val;
            }
        }
    }

    return bool;
}
