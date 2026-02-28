import { beforeEach, afterEach, describe, expect, it } from 'vitest'

import { batch, createEffect, createMemo, createSignal } from '../signals'
import { createPRNG } from './prng'

type Op =
  | { kind: 'set'; idx: number; next: number }
  | { kind: 'batch'; ops: Op[] }
  | { kind: 'dispose'; idx: number }

// Build a fixed graph so we can compare logs across two *fresh* runtime instances
// (i.e. signals/effects are created in a new run() call).
function makeGraph(seed: number) {
  const rng = createPRNG(seed)

  const signals = Array.from({ length: 4 }, () => createSignal(0))
  const reads = signals.map(([g]) => g)
  const writes = signals.map(([, s]) => s)

  const m0 = createMemo(() => reads[0]!() + reads[1]!())
  const m1 = createMemo(() => reads[2]!() * 10 + reads[3]!())

  const log: string[] = []

  const effects = Array.from({ length: 3 }, (_, i) => {
    const mode = rng.int(3)
    if (mode === 0) {
      return createEffect(() => {
        log.push(`e${i}:m0:${m0()}`)
      })
    }
    if (mode === 1) {
      return createEffect(() => {
        log.push(`e${i}:m1:${m1()}`)
      })
    }
    const sIdx = rng.int(reads.length)
    return createEffect(() => {
      log.push(`e${i}:s${sIdx}:${reads[sIdx]!()}`)
    })
  })

  return { log, effects, writes }
}

function genOps(seed: number, stepCount: number): Op[] {
  const rng = createPRNG(seed)
  const ops: Op[] = []

  function op(depth: number): Op {
    const r = rng.int(100)
    if (depth < 2 && r < 20) {
      const innerCount = 1 + rng.int(4)
      const inner: Op[] = []
      for (let i = 0; i < innerCount; i++) inner.push(op(depth + 1))
      return { kind: 'batch', ops: inner }
    }
    if (r < 75) {
      return { kind: 'set', idx: rng.int(4), next: rng.int(20) }
    }
    return { kind: 'dispose', idx: rng.int(3) }
  }

  for (let i = 0; i < stepCount; i++) ops.push(op(0))
  return ops
}

function run(seed: number, ops: Op[]) {
  const { log, effects, writes } = makeGraph(seed)
  const disposed = new Set<number>()

  const apply = (o: Op) => {
    switch (o.kind) {
      case 'set':
        writes[o.idx]!(o.next)
        break
      case 'batch':
        batch(() => {
          for (const inner of o.ops) apply(inner)
        })
        break
      case 'dispose':
        if (disposed.has(o.idx)) return
        disposed.add(o.idx)
        effects[o.idx]?.dispose()
        break
    }
  }

  for (const o of ops) apply(o)

  return { log, disposedCount: disposed.size }
}

describe('runtime/signals determinism + leak-ish checks', () => {
  let flushQ: Array<() => void> = []
  const originalSetTimeout = globalThis.setTimeout

  beforeEach(() => {
    flushQ = []
    // Keep behavior consistent with other signals tests: capture scheduler flushes.
    // @ts-ignore
    globalThis.setTimeout = ((cb: any) => {
      flushQ.push(cb)
      return 0 as any
    }) as any
  })

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout
  })

  it('same seed + same op sequence => same log across fresh graph instances', () => {
    const seed = 9001
    const ops = genOps(seed, 250)

    const r1 = run(seed, ops)
    const r2 = run(seed, ops)

    expect(r1.log).toEqual(r2.log)
  })

  it('disposing an effect prevents future runs when only its dependencies change', () => {
    const seed = 42
    const { log, effects, writes } = makeGraph(seed)

    // Ensure effect[0] gets at least one run at creation.
    expect(log.length).toBeGreaterThan(0)

    // Dispose effect 0 and then change all signals many times.
    effects[0]!.dispose()
    const before = log.slice()

    for (let i = 0; i < 20; i++) {
      writes[0]!(i)
      writes[1]!(i)
      writes[2]!(i)
      writes[3]!(i)
    }

    // The disposed effect must not contribute any new entries.
    // We can't easily isolate which effect wrote which without assuming makeGraph shape,
    // but we *can* ensure the log doesn't contain any new `e0:` entries.
    const newEntries = log.slice(before.length)
    expect(newEntries.some((l) => l.startsWith('e0:'))).toBe(false)
  })
})
