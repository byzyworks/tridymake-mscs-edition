import { Tag } from '../src/utility/Tag.js';

export default function(params) {
	const test = String(params.args[1]);

    let str = '';

    for (const tagset of params.index.context) {
        for (const tested of tagset) {
            const key = Tag.getIdentifier(tested);
            const val = Tag.getValue(tested);
            if (test === key) {
                if (val !== undefined) {
                    str += String(val);
                }
            }
        }
    }

    return str;
}
