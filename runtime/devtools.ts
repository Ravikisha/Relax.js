export type DevtoolsEvent =
  | { type: 'slotWrite'; slotKind: string; slotKey: string }
  | { type: 'scheduleComputation'; name?: string; lane?: string }
  | { type: 'flushStart' }
  | { type: 'flushEnd'; durationMs: number }
  | { type: 'domOp'; op: string }
  | { type: 'alloc'; kind: string; count?: number }

export type DevtoolsCounters = {
  slotWrites: number
  scheduledComputations: number
  flushes: number
  flushTimeMs: number

  // Optional perf instrumentation (disabled by default).
  domOps: number
  allocs: number
}

export type DevtoolsHook = (event: DevtoolsEvent) => void

let _hook: DevtoolsHook | null = null
const _counters: DevtoolsCounters = {
  slotWrites: 0,
  scheduledComputations: 0,
  flushes: 0,
  flushTimeMs: 0,
  domOps: 0,
  allocs: 0,
}

let _instrumentationEnabled = false

export function setInstrumentationEnabled(enabled: boolean) {
  _instrumentationEnabled = enabled
}

export function isInstrumentationEnabled(): boolean {
  return _instrumentationEnabled
}

export function setDevtoolsHook(hook: DevtoolsHook | null) {
  _hook = hook
}

export function getDevtoolsCounters(): DevtoolsCounters {
  // Return a copy so tests/users can't mutate internal counters.
  return { ..._counters }
}

export function resetDevtoolsCounters() {
  _counters.slotWrites = 0
  _counters.scheduledComputations = 0
  _counters.flushes = 0
  _counters.flushTimeMs = 0
  _counters.domOps = 0
  _counters.allocs = 0
}

export function emitDevtoolsEvent(event: DevtoolsEvent) {
  switch (event.type) {
    case 'slotWrite':
      _counters.slotWrites++
      break
    case 'scheduleComputation':
      _counters.scheduledComputations++
      break
    case 'flushStart':
      _counters.flushes++
      break
    case 'flushEnd':
      _counters.flushTimeMs += event.durationMs
      break
    case 'domOp':
      if (_instrumentationEnabled) _counters.domOps++
      break
    case 'alloc':
      if (_instrumentationEnabled) _counters.allocs += event.count ?? 1
      break
  }

  // Always forward events to the hook (even when instrumentation is disabled)
  // so users can implement their own filtering.
  _hook?.(event)
}

export function emitDomOp(op: string) {
  if (!_instrumentationEnabled && !_hook) return
  emitDevtoolsEvent({ type: 'domOp', op })
}

export function emitAlloc(kind: string, count?: number) {
  if (!_instrumentationEnabled && !_hook) return
  if (count === undefined) {
    emitDevtoolsEvent({ type: 'alloc', kind })
  } else {
    emitDevtoolsEvent({ type: 'alloc', kind, count })
  }
}
