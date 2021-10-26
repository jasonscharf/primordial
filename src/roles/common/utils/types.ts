export type PropSet<T> = {
    [Property in keyof T];
};

export type PartialPropSet<T> = {
    [Property in keyof Partial<T>];
};
