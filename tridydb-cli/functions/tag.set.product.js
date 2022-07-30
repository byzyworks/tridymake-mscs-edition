import { Tag } from '../src/utility/Tag.js';

export default function(params) {
	const args = params.args;
	
	args.splice(0, 1);

    let num = 1;

    if (params.index.context.length === 0) {
        return num;
    }
    const tagset = params.index.context[params.index.context.length - 1];

    for (const test of args) {
        for (const tested of tagset) {
            const key = Tag.getIdentifier(tested);
            const val = Tag.getValue(tested);
            if (test === key) {
                if (typeof val === 'number') {
                    num *= val;
                }
            }
        }
    }

    return num;
}
