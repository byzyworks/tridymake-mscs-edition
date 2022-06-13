export class Tag {
    constructor() { }

    static getIdentifier(tag) {
        return tag.split(':')[0];
    }

    static getValue(tag) {
        tag = tag.split(':');
        if ((tag.length !== 2) || (isNaN(tag[1]))) {
            return null;
        }
        return Number(tag[1]);
    }
}
