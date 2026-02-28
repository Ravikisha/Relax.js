export type PRNG = {
    next(): number;
    int(maxExclusive: number): number;
    bool(): boolean;
    pick<T>(arr: readonly [T, ...T[]]): T;
};
export declare function createPRNG(seed: number): PRNG;
//# sourceMappingURL=prng.d.ts.map