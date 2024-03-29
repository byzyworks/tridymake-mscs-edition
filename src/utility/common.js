export const pushAll = (target, source) => {
    for (const part of source) {
        target.push(part);
    }
}

export const isNullish = (obj) => {
    return (obj === undefined) || (obj === null);
}

export const isBoolean = (obj) => {
    return (typeof obj === 'boolean') || (obj === 1) || (obj === 0) || (obj === 'true') || (obj === 'false');
}

export const isNumber = (obj) => {
    return !isNaN(obj);
}

export const isString = (obj) => {
    return (typeof obj === 'string');
}

export const isPrimitive = (obj) => {
    return !isObject(obj) && !isNullish(obj);
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

    if (isDictionary(obj)) {
        let order = 0;
        for (const key in obj) {
            if (isNaN(key) || key != order) {
                return false;
            }
            order++;
        }
        return true;
    }

    /**
     * This will return false on receiving a primitive type.
     * It does this because, even though we could simply make a primitive the first element of a new array "without losing information",
     * we could do the same to any primitive or complex type, making this function pretty pointless since that means everything can be made an array in some sense.
     * Thus, it more accurately means "could I change the value of this variable in-place to be an array without a loss of information, and without changing how it's accessed?"
     */
    return false;
}

/**
 * A "basic" value is completely interchangable with all formats (primitive, array, map/dictionary) "without losing information".
 */
export const isBasic = (obj) => {
    if (isNullish(obj)) {
        return true;
    }
    if (isPrimitive(obj)) {
        return true;
    }
    if (isArray(obj) && (obj.length === 1)) {
        return true;
    }
    if (isDictionary(obj)) {
        const keys = Object.keys(obj);
        if ((keys.length === 1) && (keys[0] === '0')) {
            return true;
        }
    }
    return false;
}

export const reduce = (obj, opts = { }) => {
    opts.degree = opts.degree ?? 3;

    if (opts.degree > 0) {
        if (isDictionary(obj) && isArrayableObject(obj)) {
            const reduced = [ ];
            for (const part of Object.values(obj)) {
                reduced.push(part);
            }
            obj = reduced;
        }

        if ((opts.degree > 1) && isArray(obj)) {
            if (obj.length === 1) {
                obj = obj[0];
            } else if ((opts.degree > 2) && (obj.length === 0)) {
                obj = undefined;
            }
        }
    }

    return obj;
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
    let copy = source;
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

export const deepModifyKey = (target, stop_key, old_key, new_key) => {
    for (const property in target) {
        if (property === stop_key) {
            continue;
        }
        
        if (isObject(target[property]) && !isEmpty(target[property])) {
            deepModifyKey(target[property], stop_key, old_key, new_key);
        }

        if (property === old_key) {
            target[new_key] = target[property];
            delete target[property];
        }
    }
}

export const deepModifyValue = (target, callback) => {
    let modified;
    for (const property in target) {
        if (isObject(target[property]) && !isEmpty(target[property])) {
            deepModifyValue(target[property], callback);
        } else {
            modified = callback(target[property]);
            target[property] = modified;
        }
    }
}

export const isEmpty = (obj) => {
    if (obj === undefined) {
        return true;
    } else if (isArray(obj)) {
        return obj.length === 0;
    } else if (isDictionary(obj)) {
        return Object.keys(obj).length === 0;
    } else if (typeof obj === 'string') {
        return obj === '';
    }
}

export const hasDuplicates = (arr, arr2) => {
    arr2 = arr2 ?? arr;

    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr2.length; j++) {
            if (arr[i] === arr2[j]) {
                return true;
            }
        }
    }
    return false;
}

export const parseDynamic = (value) => {
    if (!isNaN(value)) {
        return Number(value);
    } else {
        switch (value) {
            case 'true':
                return true;
            case 'false':
                return false;
            case 'null':
                return null;
            default:
                return value;
        }
    }
}

export const not = (fn, ...args) => {
    return () => {
        return !fn(args);
    }
}
