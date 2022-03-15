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
