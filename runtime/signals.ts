export type EffectCleanup = void | (() => void)

export type Signal<T> = {
  get(): T
  set(next: T | ((prev: T) => T)): void
}

export type Effect = {
  dispose(): void
}

type Observer = Computation

type SignalNode<T> = {
  value: T
  observers: Set<Observer>
}

type Computation = {
  run(): void
  dispose(): void
  sources: Set<SignalNode<any>>
  cleanup?: () => void
}

let currentComputation: Computation | null = null
let nextId = 0

let isBatching = 0
const pending = new Set<Computation>()

function schedule(computation: Computation) {
  if (isBatching > 0) {
    pending.add(computation)
    return
  }
  computation.run()
}

export function createSignal<T>(initial: T): [() => T, (next: T | ((prev: T) => T)) => void] {
  const node: SignalNode<T> = {
    value: initial,
    observers: new Set(),
  }

  function read(): T {
    if (currentComputation != null) {
      node.observers.add(currentComputation)
      currentComputation.sources.add(node)
    }
    return node.value
  }

  function write(next: T | ((prev: T) => T)) {
    const nextValue = typeof next === 'function' ? (next as any)(node.value) : next
    if (Object.is(nextValue, node.value)) return

    node.value = nextValue

    // deterministic order: creation id
    const observers = Array.from(node.observers)
      .filter((o) => o !== null)
      .sort((a: any, b: any) => (a._id ?? 0) - (b._id ?? 0))

  for (const obs of observers) schedule(obs)
  }

  return [read, write]
}

export function createEffect(fn: () => EffectCleanup): Effect {
  const comp: Computation & { _id: number } = {
    _id: nextId++,
    sources: new Set(),
    run() {
      if (comp.cleanup) {
        try {
          comp.cleanup()
        } finally {
          delete comp.cleanup
        }
      }

      for (const src of comp.sources) src.observers.delete(comp)
      comp.sources.clear()

      const prev = currentComputation
      currentComputation = comp
      try {
        const cleanup = fn()
        if (typeof cleanup === 'function') comp.cleanup = cleanup
      } finally {
        currentComputation = prev
      }
    },
    dispose() {
      if (comp.cleanup) {
        try {
          comp.cleanup()
        } finally {
          delete comp.cleanup
        }
      }
      for (const src of comp.sources) src.observers.delete(comp)
      comp.sources.clear()
    },
  }

  comp.run()

  return {
    dispose: () => comp.dispose(),
  }
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
      for (const comp of toRun) comp.run()
    }
  }
}
