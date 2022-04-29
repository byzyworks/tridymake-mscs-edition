export const APP = Object.freeze({
    NAME:    'TridyDB CLI',
    VERSION: '1.0.1'
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
        nested: 'tree'
    },
    remote: {
        enable:  false,
        host:    'localhost',
        port:    21780,
        timeout: 3000
    },
    output: {
        pretty: false
    },
    log_level: 'info'
});
export const global = deepCopy(defaults);
global.defaults     = Object.freeze(deepCopy(defaults));