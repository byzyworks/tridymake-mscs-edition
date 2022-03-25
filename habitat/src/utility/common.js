export const app = {
    name:    'Wingspan Habitat',
    version: '1.0.0'
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

export const overlay = (target, source) => {
    for (const property in source) {
        if (isObject(source[property])) {
            overlay(target[property], source[property]);
        } else {
            target[property] = source[property];
        }
    }
}

export const deepCopy = (source) => {
    const target = isArray(source) ? [ ] : { };

    for (const property in source) {
        if (isObject(source[property])) {
            target[property] = deepCopy(source[property]);
        } else {
            target[property] = source[property];
        }
    }
    
    return target;
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
