export { createSignal, createEffect, createMemo, batch, untrack } from './signals';
export { createScheduler } from './scheduler';
export { createBrowserScheduler, createRequestFlush } from './scheduler';
export type { Lane, ScheduledTask, SchedulerOptions, FlushStrategy } from './scheduler';
export { defineBlock, mountBlock, mountCompiledBlock } from './block';
export type { BlockDef, BlockSlot, MountedBlock, CompiledSlot, MountCompiledBlockOptions } from './block';
export { hydrateBlock } from './hydration';
export { reconcileChildren } from './reconciler';
export type { ReconcileNode, ReconcileRange, ReconcileItem, ReconcileOptions, Key } from './reconciler';
export { mountFallback } from './fallback';
export type { MountedFallback, MountFallbackOptions, FallbackRenderResult } from './fallback';
export type { Memo, MemoOptions } from './signals';
export type { EffectOptions } from './signals';
/**
 * Run `fn` and, if the time budget is exceeded and scheduler work remains,
 * ensure continuation work is flushed in a later tick.
 */
export declare function withBudget<T>(budgetMs: number, fn: () => T): T;
/** Optionally cap the budget used by scheduled flushes. */
export declare function setFrameBudget(ms: number): void;
//# sourceMappingURL=index.d.ts.map