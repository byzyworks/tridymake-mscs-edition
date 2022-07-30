import { Tag } from '../src/utility/Tag.js';

export default function(params) {
	const test = String(params.args[1]);

    let num = 0;

    for (const tagset of params.index.context) {
        for (const tested of tagset) {
            const key = Tag.getIdentifier(tested);
            const val = Tag.getValue(tested);
            if (test === key) {
                if (typeof val === 'number') {
                    num += val;
                }
            }
        }
    }

    return num;
}
