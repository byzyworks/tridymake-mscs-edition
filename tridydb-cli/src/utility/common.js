export const app = {
    name:    'TridyDB CLI',
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

export const overlay = (target, source) => {
    for (const property in source) {
        if (isObject(source[property])) {
            if (!target[property] || !isObject(target[property])) {
                if (isArray(source[property])) {
                    target[property] = [ ];
                } else if (isDictionary(source[property])) {
                    target[property] = { };
                }
            } else if (isArray(target[property]) && isArray(source[property])) {
                for (const part of source[property]) {
                    target[property].push(deepCopy(part));
                }
            } else if (isArray(target[property]) && isDictionary(source[property])) {
                target[property].push(deepCopy(source[property]));
            } else if (isDictionary(target[property]) && isArray(source[property])) {
                const temp = deepCopy(source[property]);
                temp.push(deepCopy(target[property]));
                target[property] = temp;
            } else {
                overlay(target[property], source[property]);
            }
        } else {
            target[property] = source[property];
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
