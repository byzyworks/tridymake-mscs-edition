export const APP = Object.freeze({
    NAME:    'Wingspan Habitat',
    VERSION: '1.0.0'
});

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

export const isPrimitive = (obj) => {
    return !isObject(obj) && !isNullish(obj);
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

const defaults = Object.freeze({
    port: 21880,
    path: {
        templates: 'assets/templates',
        instances: 'assets/instances'
    }
});
export const global = deepCopy(defaults);
global.defaults     = Object.freeze(deepCopy(defaults));
