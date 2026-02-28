export declare const ARRAY_DIFF_OP: {
    readonly ADD: "add";
    readonly REMOVE: "remove";
    readonly MOVE: "move";
    readonly NOOP: "noop";
};
export type ArrayDiffOperation<T> = {
    op: typeof ARRAY_DIFF_OP.ADD;
    index: number;
    item: T;
    originalIndex: number;
} | {
    op: typeof ARRAY_DIFF_OP.REMOVE;
    index: number;
    item: T;
    originalIndex: number;
} | {
    op: typeof ARRAY_DIFF_OP.MOVE;
    index: number;
    item: T;
    originalIndex: number;
} | {
    op: typeof ARRAY_DIFF_OP.NOOP;
    index: number;
    item: T;
    originalIndex: number;
};
export declare function withoutNulls<T>(arr: Array<T | null | undefined>): T[];
export declare function toArray<T>(x: T | T[]): T[];
export declare function arraysDiff<T>(oldArr?: T[], newArr?: T[]): {
    removed: T[];
    added: T[];
};
export declare function arraysDiffSequence<T>(oldArr?: T[], newArr?: T[], compareFn?: (a: T, b: T) => boolean): Array<ArrayDiffOperation<T>>;
export declare function applyArraysDiffSequence<T>(oldArr: T[], ops: Array<any>): T[];
//# sourceMappingURL=arrays.d.ts.map