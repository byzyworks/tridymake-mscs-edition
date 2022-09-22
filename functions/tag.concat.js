import { Tag } from '../src/utility/Tag.js';

export default function(params) {
	const test = String(params.args[1]);
	let   str  = String(params.args[2]);

    if (params.index.context.length === 0) {
        return '';
    }
	const tagset = params.index.context[params.index.context.length - 1];

	for (const tested of tagset) {
		const key = Tag.getIdentifier(tested);
		const val = Tag.getValue(tested);
		if (test === key) {
            if (val === undefined) {
				return '';
			}
			return String(val) + str;
		}
	}
	return '';
}
