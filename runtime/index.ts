// HRBR runtime entrypoint (scaffold)
//
// This will export signals, scheduler, block runtime, and fallback reconciler.
// Implementations will be added incrementally.
import { createScheduler } from './scheduler'

export { createSignal, createEffect, createMemo, batch, untrack } from './signals'
export { createScheduler } from './scheduler'
export { createBrowserScheduler, createRequestFlush } from './scheduler'
export type { Lane, ScheduledTask, SchedulerOptions, FlushStrategy } from './scheduler'
export { defineBlock, mountBlock, mountCompiledBlock, mountNestedBlock, mountNestedFallback } from './block'
export type {
	BlockDef,
	BlockSlot,
	MountedBlock,
	MountedChild,
	CompiledSlot,
	MountCompiledBlockOptions,
	MountBlockOptions,
} from './block'
export { hydrateBlock } from './hydration'
export { renderBlockToString } from './ssr'
export { reconcileChildren } from './reconciler'
export type { ReconcileNode, ReconcileRange, ReconcileItem, ReconcileOptions, Key } from './reconciler'
export { mountFallback } from './fallback'
export type { MountedFallback, MountFallbackOptions, FallbackRenderResult } from './fallback'

export { getDevtoolsCounters, resetDevtoolsCounters, setDevtoolsHook } from './devtools'
export type { DevtoolsCounters, DevtoolsEvent, DevtoolsHook } from './devtools'

export type { Memo, MemoOptions } from './signals'
export type { EffectOptions } from './signals'

// ---------------------------------------------------------------------------
// Budgeting helpers (Phase 2 roadmap)
//
// A small, shared scheduler for runtime-level budgeting.
// This intentionally doesn't replace any user-created schedulers.
const _globalScheduler = createScheduler()

/**
 * Run `fn` and, if the time budget is exceeded and scheduler work remains,
 * ensure continuation work is flushed in a later tick.
 */
export function withBudget<T>(budgetMs: number, fn: () => T): T {
	return _globalScheduler.withBudget(budgetMs, fn)
}

/** Optionally cap the budget used by scheduled flushes. */
export function setFrameBudget(ms: number) {
	_globalScheduler.setFrameBudget(ms)
}

