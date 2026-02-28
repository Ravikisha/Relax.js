import type { Lane } from './scheduler'
import { createScheduler } from './scheduler'
import { emitDevtoolsEvent } from './devtools'

export type EffectCleanup = void | (() => void)

export type EffectOptions = {
  /** Which scheduler lane to use. Defaults to 'sync' (run immediately). */
  lane?: Lane
  /** Per-effect budget forwarded to scheduler. */
  budgetMs?: number
  /** Optional debug label (not used for behavior yet). */
  name?: string
}

export type MemoOptions<T> = {
  /** Optional equality function to reduce downstream invalidations. Defaults to `Object.is`. */
  equals?: (prev: T, next: T) => boolean
}

export type Signal<T> = {
  get(): T
  set(next: T | ((prev: T) => T)): void
}

export type Effect = {
  dispose(): void
}

export type Memo<T> = {
  (): T
}

type Observer = Computation

type SignalNode<T> = {
  value: T
  // Intrusive observer list; maintained in ascending computation _id order.
  observersHead: ObserverLink | null
  observersTail: ObserverLink | null
}

type ObserverLink = {
  comp: Observer
  prev: ObserverLink | null
  next: ObserverLink | null
}

type SourceLink = {
  node: SignalNode<any>
  observerLink: ObserverLink
  prev: SourceLink | null
  next: SourceLink | null
}

type Computation = {
  run(): void
  dispose(): void
  sourcesHead: SourceLink | null
  sourcesTail: SourceLink | null
  cleanup?: () => void
  _schedule?: (c: Computation) => void
  _disposed?: boolean
  _running?: boolean
  _id?: number
}

let currentComputation: Computation | null = null
let nextId = 0

let isBatching = 0
const pending = new Set<Computation>()

function scheduleComputation(computation: Computation) {
  if (computation._disposed) return
  if (computation._running) {
    // Allow a running computation to be scheduled again; it will flush after it unwinds.
    pending.add(computation)
    return
  }
  if (computation._schedule) {
    emitDevtoolsEvent({
      type: 'scheduleComputation',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: (computation as any)._name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lane: (computation as any)._lane,
    })
    computation._schedule(computation)
    return
  }
  if (isBatching > 0) {
    pending.add(computation)
    return
  }
  emitDevtoolsEvent({
    type: 'scheduleComputation',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: (computation as any)._name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lane: (computation as any)._lane,
  })
  computation.run()
}

function flushPendingIfNeeded() {
  if (isBatching > 0) return
  if (pending.size === 0) return
  // Flush in deterministic creation order.
  const toRun = Array.from(pending).sort((a: any, b: any) => (a._id ?? 0) - (b._id ?? 0))
  pending.clear()
  for (const comp of toRun) scheduleComputation(comp)
}

function unlinkObserver(node: SignalNode<any>, link: ObserverLink) {
  const prev = link.prev
  const next = link.next
  if (prev) prev.next = next
  else node.observersHead = next
  if (next) next.prev = prev
  else node.observersTail = prev
  link.prev = null
  link.next = null
}

function unlinkAllSources(comp: Computation) {
  let cur = comp.sourcesHead
  while (cur) {
    const next = cur.next
    unlinkObserver(cur.node, cur.observerLink)
    cur.prev = null
    cur.next = null
    // Break references to help GC in this prototype implementation.
    // (In a pooled-node version, we would recycle the link objects.)
    // @ts-expect-error - intentional nulling
    cur.node = null
    // @ts-expect-error - intentional nulling
    cur.observerLink = null
    cur = next
  }
  comp.sourcesHead = null
  comp.sourcesTail = null
}

function addObserver(node: SignalNode<any>, comp: Computation) {
  // Insert comp into node observer list in ascending _id order.
  const id = (comp as any)._id ?? 0

  // Fast path: append if list empty or id >= tail.
  const tail = node.observersTail
  if (!tail || (((tail.comp as any)._id ?? 0) <= id)) {
    const link: ObserverLink = { comp, prev: tail, next: null }
    if (tail) tail.next = link
    else node.observersHead = link
    node.observersTail = link

    const src: SourceLink = { node, observerLink: link, prev: comp.sourcesTail, next: null }
    if (comp.sourcesTail) comp.sourcesTail.next = src
    else comp.sourcesHead = src
    comp.sourcesTail = src
    return
  }

  // Insert before first with greater id.
  let cur = node.observersHead
  while (cur) {
    const curId = ((cur.comp as any)._id ?? 0)
    if (id < curId) {
      const link: ObserverLink = { comp, prev: cur.prev, next: cur }
      if (cur.prev) cur.prev.next = link
      else node.observersHead = link
      cur.prev = link

      const src: SourceLink = { node, observerLink: link, prev: comp.sourcesTail, next: null }
      if (comp.sourcesTail) comp.sourcesTail.next = src
      else comp.sourcesHead = src
      comp.sourcesTail = src
      return
    }
    // Note: we intentionally don't dedupe here; the runtime clears sources on each run.
    cur = cur.next
  }
}

export function createSignal<T>(initial: T): [() => T, (next: T | ((prev: T) => T)) => void] {
  const node: SignalNode<T> = {
    value: initial,
  observersHead: null,
  observersTail: null,
  }

  function read(): T {
    if (currentComputation != null) {
  addObserver(node, currentComputation)
    }
    return node.value
  }

  function write(next: T | ((prev: T) => T)) {
    const nextValue = typeof next === 'function' ? (next as any)(node.value) : next
    if (Object.is(nextValue, node.value)) return

    node.value = nextValue

    // Deterministic order is maintained by the linked list.
    let cur = node.observersHead
    while (cur) {
  // Running an observer typically unsubscribes/resubscribes, which mutates the list.
  // Capture next first so we traverse the original order deterministically.
  const next = cur.next
  scheduleComputation(cur.comp)
  cur = next
    }
  }

  return [read, write]
}

export function createEffect(fn: () => EffectCleanup): Effect
export function createEffect(fn: () => EffectCleanup, options: EffectOptions): Effect
export function createEffect(fn: () => EffectCleanup, options: EffectOptions = {}): Effect {
  const lane = options.lane ?? 'sync'
  const budgetMs = options.budgetMs
  const name = options.name

  const scheduler = lane === 'sync' ? null : createScheduler()

  const comp: Computation & { _id: number; _name?: string; _lane?: Lane } = {
    _id: nextId++,
    ...(name ? { _name: name } : null),
    _lane: lane,
  sourcesHead: null,
  sourcesTail: null,
    run() {
  if (comp._disposed) return
  if (comp._running) return
  comp._running = true
      if (comp.cleanup) {
        try {
          comp.cleanup()
        } finally {
          delete comp.cleanup
        }
      }

  unlinkAllSources(comp)

      const prev = currentComputation
      currentComputation = comp
      try {
        const cleanup = fn()
        if (typeof cleanup === 'function') comp.cleanup = cleanup
      } finally {
        currentComputation = prev
        comp._running = false
  flushPendingIfNeeded()
      }
    },
    dispose() {
      if (comp._disposed) return
      comp._disposed = true
      if (comp.cleanup) {
        try {
          comp.cleanup()
        } finally {
          delete comp.cleanup
        }
      }
  unlinkAllSources(comp)
    },
  }

  // Initial run respects lane: sync runs now; others schedule.
  if (lane === 'sync') {
    comp.run()
  } else {
    scheduler!.schedule(lane, () => comp.run(), budgetMs)
  }

  if (scheduler) {
    comp._schedule = (c) => {
  if (c._disposed) return
  if (c._running) return
      if (isBatching > 0) {
        pending.add(c)
        return
      }
      scheduler.schedule(lane, () => c.run(), budgetMs)
    }
    const originalDispose = comp.dispose
    comp.dispose = () => {
      delete comp._schedule
      originalDispose()
    }
  }

  return {
    dispose: () => comp.dispose(),
  }
}

export function createMemo<T>(fn: () => T, opts: MemoOptions<T> = {}): Memo<T> {
  const equals = opts.equals ?? Object.is

  const node: SignalNode<T> = {
    value: undefined as any as T,
  observersHead: null,
  observersTail: null,
  }

  let hasValue = false

  const comp: Computation & { _id: number } = {
    _id: nextId++,
    sourcesHead: null,
    sourcesTail: null,
    run() {
  if (comp._disposed) return
  if (comp._running) return
  comp._running = true
      // unsubscribe from previous sources
      unlinkAllSources(comp)

      const prev = currentComputation
      currentComputation = comp
      let nextValue!: T
      try {
        nextValue = fn()
      } finally {
        currentComputation = prev
  comp._running = false
  flushPendingIfNeeded()
      }

      if (!hasValue) {
        node.value = nextValue
        hasValue = true
        return
      }

      if (equals(node.value, nextValue)) return

      node.value = nextValue

      let cur = node.observersHead
      while (cur) {
        scheduleComputation(cur.comp)
        cur = cur.next
      }
    },
    dispose() {
  if (comp._disposed) return
  comp._disposed = true
      unlinkAllSources(comp)
      node.observersHead = null
      node.observersTail = null
    },
  }

  function read(): T {
    if (!hasValue) comp.run()
    if (currentComputation != null) {
  addObserver(node, currentComputation)
    }
    return node.value
  }

  return read
}

export function untrack<T>(fn: () => T): T {
  const prev = currentComputation
  currentComputation = null
  try {
    return fn()
  } finally {
    currentComputation = prev
  }
}

export function batch<T>(fn: () => T): T {
  isBatching++
  try {
    return fn()
  } finally {
    isBatching--
    if (isBatching === 0 && pending.size > 0) {
      const toRun = Array.from(pending).sort((a: any, b: any) => (a._id ?? 0) - (b._id ?? 0))
      pending.clear()
  for (const comp of toRun) scheduleComputation(comp)
    }
  }
}
