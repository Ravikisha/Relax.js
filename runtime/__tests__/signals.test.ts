import { describe, expect, test, vi } from 'vitest'

import { batch, createEffect, createSignal, untrack } from '../signals'

describe('runtime/signals (phase 1)', () => {
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
})
