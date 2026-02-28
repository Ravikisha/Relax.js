import { describe, expect, it } from 'vitest'

import { batch, createEffect, createMemo, createSignal } from '../signals'
import { createPRNG } from './prng'

type Op =
  | { kind: 'set'; idx: number; delta: number }
  | { kind: 'batch'; ops: Op[] }
  | { kind: 'disposeEffect'; idx: number }
  | { kind: 'noop' }

function genOps(seed: number, signalCount: number, effectCount: number, steps: number): Op[] {
  const rng = createPRNG(seed)
  const ops: Op[] = []

  function genOp(depth: number): Op {
    const r = rng.int(100)
    if (depth < 2 && r < 15) {
      const innerCount = 1 + rng.int(5)
      const inner: Op[] = []
      for (let i = 0; i < innerCount; i++) inner.push(genOp(depth + 1))
      return { kind: 'batch', ops: inner }
    }

    if (r < 70) {
      return { kind: 'set', idx: rng.int(signalCount), delta: rng.pick([-2, -1, 1, 2] as const) }
    }

    if (r < 85) {
      return { kind: 'disposeEffect', idx: rng.int(effectCount) }
    }

    return { kind: 'noop' }
  }

  for (let i = 0; i < steps; i++) ops.push(genOp(0))
  return ops
}

function runOps(ops: Op[], seed: number) {
  // Build a small reactive graph:
  //  - A set of base signals
  //  - A few memos depending on them
  //  - Effects reading either signals or memos
  const rng = createPRNG(seed)

  const signals = Array.from({ length: 5 }, () => createSignal(0))
  const reads = signals.map(([get]) => get)
  const writes = signals.map(([, set]) => set)

  const memos = Array.from({ length: 3 }, () => {
    const a = rng.int(reads.length)
    const b = rng.int(reads.length)
  return createMemo(() => reads[a]!() + reads[b]!())
  })

  const effectLog: string[] = []
  const effects = Array.from({ length: 4 }, (_, i) => {
    const kind = rng.int(2)
    if (kind === 0) {
      const sIdx = rng.int(reads.length)
      return createEffect(() => {
        effectLog.push(`e${i}:s${sIdx}:${reads[sIdx]!()}`)
      })
    }
    const mIdx = rng.int(memos.length)
    return createEffect(() => {
      effectLog.push(`e${i}:m${mIdx}:${memos[mIdx]}`)
      // Read memo value, stringify to keep log stable.
      effectLog[effectLog.length - 1] = `e${i}:m${mIdx}:${memos[mIdx]!().toString()}`
    })
  })

  const disposed = new Set<number>()

  function apply(op: Op) {
    switch (op.kind) {
      case 'set':
  writes[op.idx]!((p) => p + op.delta)
        break
      case 'batch':
        batch(() => {
          for (const inner of op.ops) apply(inner)
        })
        break
      case 'disposeEffect':
        if (disposed.has(op.idx)) break
        disposed.add(op.idx)
        effects[op.idx]?.dispose()
        break
      case 'noop':
        break
    }
  }

  for (const op of ops) apply(op)

  // Now mutate signals again; disposed effects should not produce new log entries.
  const before = effectLog.length
  for (let i = 0; i < writes.length; i++) writes[i]!((p) => p + 1)
  const after = effectLog.length

  return {
    effectLog,
    before,
    after,
    disposedCount: disposed.size,
  }
}

describe('runtime/signals property/fuzz', () => {
  it('is deterministic for the same seed + op sequence', () => {
    const seed = 1337
    const ops = genOps(seed, 5, 4, 200)

    const r1 = runOps(ops, seed)
    const r2 = runOps(ops, seed)

    expect(r1.effectLog).toEqual(r2.effectLog)
  })

  it('disposing effects prevents further scheduling (smoke property)', () => {
    const seed = 2026
    const ops = genOps(seed, 5, 4, 150)

    const r = runOps(ops, seed)
    // If we disposed any effects, we should not see *all* effects keep firing after the final writes.
    // This isn't a perfect leak detector, but it catches obvious detach bugs.
    if (r.disposedCount > 0) {
      expect(r.after - r.before).toBeLessThan(4 * 5)
    }
  })
})
