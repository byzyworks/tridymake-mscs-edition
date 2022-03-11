export const app = {
    name:    'Wingspan Habitat',
    version: '1.0.0'
}

export type Nullable<T> = T | null;

export type DeepPartial<T> = {
    [P in keyof T]?:
        T[P] extends (infer U)[] ? DeepPartial<U>[] :
        T[P] extends object ? DeepPartial<T[P]> :
        T[P];
};

export type DeepReadOnly<T> = {
    readonly [P in keyof T]:
        T[P] extends (infer U)[] ? DeepReadOnly<U>[] :
        T[P] extends object ? DeepReadOnly<T[P]> :
        T[P];
};

export const overlay = (target: any, source: any): void => {
    for (const property in source) {
        if (typeof source[property] == 'object') {
            overlay(target[property], source[property]);
        } else {
            target[property] = source[property];
        }
    }
}
