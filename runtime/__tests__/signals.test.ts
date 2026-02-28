import { describe, expect, test, vi } from 'vitest'

import { batch, createEffect, createMemo, createSignal, untrack } from '../signals'
import { beforeEach, afterEach } from 'vitest'

describe('runtime/signals (phase 1)', () => {
  let flushQ: Array<() => void> = []
  const originalSetTimeout = globalThis.setTimeout

  beforeEach(() => {
    flushQ = []
    // Intercept the scheduler's requestFlush(setTimeout) so we can drive it deterministically.
  // @ts-ignore - overriding global for tests
    globalThis.setTimeout = ((cb: any) => {
      flushQ.push(cb)
      return 0 as any
    }) as any
  })

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout
  })

  function runAllFlushes() {
    while (flushQ.length) flushQ.shift()?.()
  }

  test('tracks dependencies and re-runs effect when signal changes', () => {
    const [count, setCount] = createSignal(0)

    const calls: number[] = []
    const eff = createEffect(() => {
      calls.push(count())
    })

    expect(calls).toEqual([0])

    setCount(1)
    expect(calls).toEqual([0, 1])

    setCount(1)
    expect(calls).toEqual([0, 1])

    eff.dispose()
    setCount(2)
    expect(calls).toEqual([0, 1])
  })

  test('untrack prevents dependency registration', () => {
    const [a, setA] = createSignal(1)

    let calls = 0
    const eff = createEffect(() => {
      calls++
      untrack(() => a())
    })

    expect(calls).toBe(1)

    setA(2)
    expect(calls).toBe(1)

    eff.dispose()
  })

  test('batch groups multiple writes into a single effect re-run', () => {
    const [count, setCount] = createSignal(0)

    const fn = vi.fn(() => {
      count()
    })

    createEffect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    batch(() => {
      setCount(1)
      setCount(2)
      setCount(3)
    })

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('batch() is a flush boundary: nested batches still only produce one re-run after outer finishes', () => {
    const [count, setCount] = createSignal(0)

    const runs: number[] = []
    createEffect(() => {
      runs.push(count())
    })

    expect(runs).toEqual([0])

    batch(() => {
      setCount(1)
      batch(() => {
        setCount(2)
        setCount(3)
      })
      setCount(4)

      // No intermediate flush inside outer batch.
      expect(runs).toEqual([0])
    })

    expect(runs).toEqual([0, 4])
  })

  test('batch() returns the callback result and preserves deterministic effect order after flush', () => {
    const [s, setS] = createSignal(0)
    const log: string[] = []

    createEffect(() => {
      log.push(`a:${s()}`)
    })
    createEffect(() => {
      log.push(`b:${s()}`)
    })

    log.length = 0

    const out = batch(() => {
      setS(1)
      setS(2)
      return 'ok' as const
    })

    expect(out).toBe('ok')
    expect(log).toEqual(['a:2', 'b:2'])
  })

  test('effects run deterministically (creation order)', () => {
    const [s, setS] = createSignal(0)

    const log: string[] = []

    createEffect(() => {
      log.push(`a:${s()}`)
    })
    createEffect(() => {
      log.push(`b:${s()}`)
    })

    log.length = 0
    setS(1)

    expect(log).toEqual(['a:1', 'b:1'])
  })

  test('effect cleanup runs before re-run and on dispose', () => {
    const [s, setS] = createSignal(0)

    const cleanup = vi.fn()
    const runs = vi.fn(() => {
      s()
      return cleanup
    })

    const eff = createEffect(runs)
    expect(runs).toHaveBeenCalledTimes(1)
    expect(cleanup).toHaveBeenCalledTimes(0)

    setS(1)
    expect(runs).toHaveBeenCalledTimes(2)
    // cleanup runs before the second run
    expect(cleanup).toHaveBeenCalledTimes(1)

    eff.dispose()
    // cleanup runs on dispose as well
    expect(cleanup).toHaveBeenCalledTimes(2)

    setS(2)
    expect(runs).toHaveBeenCalledTimes(2)
  })

  test('disposed effects fully detach: further writes do not schedule work', () => {
    const [s, setS] = createSignal(0)

    const fn = vi.fn(() => {
      s()
    })

    const eff = createEffect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    eff.dispose()
    setS(1)

    // If dispose didn't detach, we'd see another call.
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('re-entrancy: effect that schedules itself via writes does not recurse infinitely', () => {
    const [s, setS] = createSignal(0)

    const seen: number[] = []
    createEffect(() => {
      const v = s()
      seen.push(v)
      if (v < 3) setS(v + 1)
    })

    // We should converge without stack overflow; exact sequence is deterministic.
    expect(seen).toEqual([0, 1, 2, 3])
  })

  test('createEffect({ lane }) schedules initial run (non-sync)', () => {
    const [s, setS] = createSignal(0)
    const calls: number[] = []

    createEffect(
      () => {
        calls.push(s())
      },
      { lane: 'default' }
    )

    // Not run until the scheduler flushes.
    expect(calls).toEqual([])
    runAllFlushes()
    expect(calls).toEqual([0])

    setS(1)
    expect(calls).toEqual([0])
    runAllFlushes()
    expect(calls).toEqual([0, 1])
  })

  test('createEffect forwards budgetMs to scheduler.schedule', () => {
    const spy = vi.fn()

    createEffect(
      () => {
        spy()
      },
      { lane: 'default', budgetMs: 123 }
    )

    // One scheduled flush should exist.
    expect(flushQ.length).toBe(1)
    runAllFlushes()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('createMemo computes from signals and updates dependents', () => {
    const [a, setA] = createSignal(1)
    const [b, setB] = createSignal(2)
    const sum = createMemo(() => a() + b())

    const seen: number[] = []
    const eff = createEffect(() => {
      seen.push(sum())
    })

    expect(seen).toEqual([3])
    setA(2)
    expect(seen).toEqual([3, 4])
    setB(10)
    expect(seen).toEqual([3, 4, 12])

    eff.dispose()
  })

  test('createMemo is lazy: does not compute until first read', () => {
    const [a, setA] = createSignal(1)
    let runs = 0
    const m = createMemo(() => {
      runs++
      return a() * 2
    })

    expect(runs).toBe(0)
    setA(2)
    expect(runs).toBe(0)

    expect(m()).toBe(4)
    expect(runs).toBe(1)

    setA(3)
    expect(m()).toBe(6)
    expect(runs).toBe(2)
  })

  test('createMemo supports custom equals to suppress downstream updates', () => {
    const [a, setA] = createSignal(1)
    const parity = createMemo(() => a() % 2, { equals: (p, n) => p === n })

    const seen: number[] = []
    const eff = createEffect(() => {
      seen.push(parity())
    })

    expect(seen).toEqual([1])
    setA(3)
    expect(seen).toEqual([1])
    setA(4)
    expect(seen).toEqual([1, 0])

    eff.dispose()
  })
})
