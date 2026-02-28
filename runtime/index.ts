// HRBR runtime entrypoint (scaffold)
//
// This will export signals, scheduler, block runtime, and fallback reconciler.
// Implementations will be added incrementally.
export { createSignal, createEffect, batch, untrack } from './signals'
export { createScheduler } from './scheduler'
export type { Lane, ScheduledTask, SchedulerOptions } from './scheduler'
export { defineBlock, mountBlock, mountCompiledBlock } from './block'
export type { BlockDef, BlockSlot, MountedBlock, CompiledSlot, MountCompiledBlockOptions } from './block'
export { hydrateBlock } from './hydration'
export { reconcileChildren } from './reconciler'
export type { ReconcileNode, ReconcileOptions, Key } from './reconciler'
export { mountFallback } from './fallback'
export type { MountedFallback, MountFallbackOptions, FallbackRenderResult } from './fallback'
