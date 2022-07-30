import { Tag } from '../src/utility/Tag.js';

export default function(params) {
	const test = String(params.args[1]);

    if (params.index.context.length === 0) {
        return 0;
    }
	const tagset = params.index.context[params.index.context.length - 1];

	for (const tested of tagset) {
		const key = Tag.getIdentifier(tested);
		const val = Tag.getValue(tested);
		if (test === key) {
            if (typeof val !== 'number') {
				return 0;
			}
			return val + 1;
		}
	}
	return 0;
}
