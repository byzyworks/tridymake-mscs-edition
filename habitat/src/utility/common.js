export const app = {
    name:    'Wingspan Habitat',
    version: '1.0.0'
}

export const overlay = (target, source) => {
    for (const property in source) {
        if (typeof source[property] == 'object') {
            overlay(target[property], source[property]);
        } else {
            target[property] = source[property];
        }
    }
}

export const isEmpty = (obj) => {
    if (Array.isArray(obj)) {
        return obj.length === 0;
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).length === 0;
    } else if (typeof obj === 'string') {
        return obj === '';
    } else {
        return obj === undefined;
    }
}
