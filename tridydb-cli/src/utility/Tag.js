import { isDictionary } from './common.js';

export class Tag {
    constructor() { }

    static getIdentifier(tag) {
        if (isDictionary(tag)) {
            return Object.keys(tag)[0];
        }
        return tag;
    }

    static getValue(tag) {
        if (isDictionary(tag)) {
            return Object.values(tag)[0];
        }
        return undefined;
    }

    static getTag(key, value = undefined) {
        if (value === undefined) {
            return key;
        }

        const tag = { };
        tag[key]  = value;

        return tag;
    }
}
