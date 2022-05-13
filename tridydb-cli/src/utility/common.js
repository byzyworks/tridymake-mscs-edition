export const APP = Object.freeze({
    NAME:    'TridyDB CLI',
    VERSION: '1.1.0'
});

export const pushAll = (target, source) => {
    for (const part of source) {
        target.push(part);
    }
}

export const isNullish = (obj) => {
    return (obj === undefined) || (obj === null);
}

export const isObject = (obj) => {
    return ((typeof obj === 'object') && (obj !== null));
}

export const isArray = (obj) => {
    return Array.isArray(obj);
}

export const isDictionary = (obj) => {
    return (isObject(obj) && !isArray(obj));
}

/**
 * This function is used to refer to an object that can be converted directly to an array without a loss of information.
 * More specifically, that means it's a complex object with an ordered, integer-only set of keys starting at 0 that may or may not be an array, internally.
 */
export const isArrayableObject = (obj) => {
    if (isArray(obj)) {
        return true;
    }

    /**
     * This is to return false on receiving a primitive type.
     * It does this because, even though we could simply make a primitive the first element of a new array "without losing information",
     * we could do the same to any primitive or complex type, making this function pretty pointless since that means everything can be made an array in some sense.
     * Thus, it more accurately means "could I change the value of this variable in-place to be an array without a loss of information, and without changing how it's accessed?"
     */
    if (!isDictionary(obj)) {
        return false;
    }

    let order = 0;
    for (const key in obj) {
        if (isNaN(key) || key != order) {
            return false;
        }
        order++;
    }

    return true;
}

export const isPrimitive = (obj) => {
    return !isObject(obj) && !isNullish(obj);
}

export const toArray = (obj) => {
    if (isArray(obj)) {
        return obj;
    } else if (isDictionary(obj)) {
        return Object.values(obj);
    } else if (obj === undefined) {
        return [ ];
    } else {
        return [ obj ];
    }
}

export const toDictionary = (obj) => {
    if (isDictionary(obj)) {
        return obj;
    } else if (isArray(obj)) {
        const dict = { };
        let   idx  = 0;
        for (const elem of obj) {
            dict[idx] = elem;
        }
        return dict;
    } else if (obj === undefined) {
        return { };
    } else {
        return { 0: obj };
    }
}

export const deepCopy = (source) => {
    let copy;
    if ((source !== undefined) && isObject(source)) {
        if (isArray(source)) {
            copy = [ ];
        } else if (isDictionary(source)) {
            copy = { };
        }

        for (const property in source) {
            if (isObject(source[property])) {
                copy[property] = deepCopy(source[property]);
            } else {
                copy[property] = source[property];
            }
        }
    } else {
        copy = source;
    }
    
    return copy;
}

export const deepOverlay = (target, source) => {
    for (const property in source) {
        if (isArray(target[property]) && isArray(source[property])) {
            for (const part of source[property]) {
                target[property].push(deepCopy(part));
            }
        } else if (isDictionary(target[property]) && isDictionary(source[property])) {
            deepOverlay(target[property], source[property]);
        } else {
            target[property] = deepCopy(source[property]);
        }
    }
}

export const deepModify = (target, callback) => {
    let modified;
    for (const property in source) {
        if (isObject(target[property])) {
            deepOverlay(target[property], source[property]);
        } else {
            modified = callback(target[property]);
            target[property] = modified;
        }
    }
}

export const isEmpty = (obj) => {
    if (obj === undefined) {
        return true;
    } else {
        if (isArray(obj)) {
            return obj.length === 0;
        } else if (isDictionary(obj)) {
            return Object.keys(obj).length === 0;
        } else if (typeof obj === 'string') {
            return obj === '';
        }
    }
}

export const hasDuplicates = (arr) => {
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] == arr[j]) {
                return true;
            }
        }
    }
    return false;
}

const defaults = Object.freeze({
    alias: {
        tags:   'tags',
        state:  'free',
        nested: 'tree',
        type:   'type'
    },
    remote: {
        enable:  false,
        host:    'localhost',
        port:    21780,
        timeout: 3000
    },
    output: {
        pretty:   false,
        compress: false
    },
    log_level: 'info'
});
export const global = deepCopy(defaults);
global.defaults     = Object.freeze(deepCopy(defaults));