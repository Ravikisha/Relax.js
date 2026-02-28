import type { Lane } from './scheduler';
export type EffectCleanup = void | (() => void);
export type EffectOptions = {
    /** Which scheduler lane to use. Defaults to 'sync' (run immediately). */
    lane?: Lane;
    /** Per-effect budget forwarded to scheduler. */
    budgetMs?: number;
    /** Optional debug label (not used for behavior yet). */
    name?: string;
};
export type MemoOptions<T> = {
    /** Optional equality function to reduce downstream invalidations. Defaults to `Object.is`. */
    equals?: (prev: T, next: T) => boolean;
};
export type Signal<T> = {
    get(): T;
    set(next: T | ((prev: T) => T)): void;
};
export type Effect = {
    dispose(): void;
};
export type Memo<T> = {
    (): T;
};
export declare function createSignal<T>(initial: T): [() => T, (next: T | ((prev: T) => T)) => void];
export declare function createEffect(fn: () => EffectCleanup): Effect;
export declare function createEffect(fn: () => EffectCleanup, options: EffectOptions): Effect;
export declare function createMemo<T>(fn: () => T, opts?: MemoOptions<T>): Memo<T>;
export declare function untrack<T>(fn: () => T): T;
export declare function batch<T>(fn: () => T): T;
//# sourceMappingURL=signals.d.ts.map