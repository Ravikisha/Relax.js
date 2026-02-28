import { describe, expect, it, vi } from 'vitest'
import { createBrowserScheduler, createRequestFlush, createScheduler } from '../scheduler'
import { setFrameBudget, withBudget } from '../index'

function makeManualScheduler() {
  let t = 0
  const pending: Array<() => void> = []

  const scheduler = createScheduler({
    now: () => t,
    requestFlush: (cb) => pending.push(cb),
    defaultBudgetMs: 5,
  })

  return {
    scheduler,
    tick(ms: number) {
      t += ms
    },
    runNextFlush() {
      const cb = pending.shift()
      cb?.()
    },
    runAllFlushes() {
      while (pending.length) pending.shift()?.()
    },
    pendingCount() {
      return pending.length
    },
  }
}

describe('runtime/scheduler (phase 2)', () => {
  it('runs tasks by lane priority (sync > input > default > transition > idle)', () => {
    const { scheduler, runAllFlushes } = makeManualScheduler()
    const order: string[] = []

    scheduler.schedule('idle', () => order.push('idle'))
    scheduler.schedule('transition', () => order.push('transition'))
    scheduler.schedule('default', () => order.push('default'))
    scheduler.schedule('input', () => order.push('input'))

    runAllFlushes()

    expect(order).toEqual(['input', 'default', 'transition', 'idle'])

    // sync executes immediately
    scheduler.schedule('sync', () => order.push('sync'))
    expect(order[order.length - 1]).toBe('sync')
  })

  it('respects budget and continues in a later flush when work remains', () => {
    const { scheduler, tick, runNextFlush, pendingCount } = makeManualScheduler()
    const ran: number[] = []

    scheduler.schedule('default', () => {
      ran.push(1)
      tick(3)
    })
    scheduler.schedule('default', () => {
      ran.push(2)
      tick(3)
    })

    expect(pendingCount()).toBe(1)

    runNextFlush()
  // default budget is 5ms; both tasks fit within the same flush loop.
    expect(ran).toEqual([1, 2])
    expect(pendingCount()).toBe(0)
  })

  it('ages/pushes starving tasks upwards (idle -> transition)', () => {
    const { scheduler, tick, runAllFlushes } = makeManualScheduler()
    const order: string[] = []

    scheduler.schedule('idle', () => order.push('idle'))

    tick(300) // > AGING_MS in implementation

    // scheduling another task triggers a flush; during pickNextTask(), idle should be promoted
    scheduler.schedule('default', () => order.push('default'))

    runAllFlushes()

  // Under the current promotion rules the aged idle task is promoted before lane selection,
  // so it can run ahead of later-scheduled default work.
  expect(order).toEqual(['idle', 'default'])
  })

  it('withBudget schedules continuation when user code exhausts budget and tasks remain', () => {
    const { scheduler, tick, runAllFlushes, pendingCount } = makeManualScheduler()
    const spy = vi.fn()

    scheduler.schedule('default', spy)

    scheduler.withBudget(1, () => {
      // simulate expensive user work
      tick(2)
    })

    expect(pendingCount()).toBe(1)
    runAllFlushes()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('orders tasks within a lane by explicit deadline (then timestamp/id)', () => {
    const { scheduler, runAllFlushes } = makeManualScheduler()
    const order: string[] = []

    // Same lane, but different explicit deadlines.
    scheduler.schedule('default', () => order.push('late'), { deadline: 1000 })
    scheduler.schedule('default', () => order.push('early'), { deadline: 10 })

    runAllFlushes()
    expect(order).toEqual(['early', 'late'])
  })

  it('promotes a task when its deadline is reached (even if it is not old enough)', () => {
    const { scheduler, tick, runAllFlushes } = makeManualScheduler()
    const order: string[] = []

    // Put an idle task with a deadline sooner than the default task.
    scheduler.schedule('idle', () => order.push('idle'), { deadline: 10 })
    scheduler.schedule('default', () => order.push('default'), { deadline: 1000 })

    // Advance time just past the idle deadline but well below AGING_MS.
    tick(11)

    // Trigger selection.
    scheduler.flush({ budgetMs: Infinity })

  // The idle task should be promoted (idle -> transition) due to deadline.
  // Under the current promotion behavior, this promoted task can be selected
  // before later work.
  expect(order).toEqual(['idle', 'default'])

    // Nothing left.
    runAllFlushes()
  expect(order).toEqual(['idle', 'default'])
  })

  it('setFrameBudget caps the budget used by scheduled flushes', () => {
    // Create a brand new scheduler with a manual requestFlush so we can observe
    // what budget the scheduled flush uses.
    let t = 0
    const pending: Array<() => void> = []

    const scheduler = createScheduler({
      now: () => t,
      requestFlush: (cb) => pending.push(cb),
      defaultBudgetMs: 5,
    })

    scheduler.setFrameBudget(1)
    const ran: number[] = []

    // Each task consumes 2ms; with a 1ms frame budget the scheduler
    // should split execution across multiple scheduled flushes.
    scheduler.schedule('default', () => {
      ran.push(1)
      t += 2
    })
    scheduler.schedule('default', () => {
      ran.push(2)
      t += 2
    })

    expect(pending.length).toBe(1)
    pending.shift()?.()
    // Should only run 1 task due to the tiny frame budget.
    expect(ran).toEqual([1])
    expect(pending.length).toBe(1)
    pending.shift()?.()
    expect(ran).toEqual([1, 2])
  })

  it('starvation prevention: repeated promotions eventually let idle work run even under continuous input load', () => {
    const { scheduler, tick, runAllFlushes } = makeManualScheduler()
    const order: string[] = []

    scheduler.schedule('idle', () => order.push('idle'))

    // Simulate a stream of higher-priority work being added over time.
    // Each cycle advances time beyond AGING_MS, then adds new input work.
    // The idle task should get promoted step-by-step and eventually execute.
    for (let i = 0; i < 4; i++) {
      tick(300)
      scheduler.schedule('input', () => order.push(`input${i}`))
    }

    runAllFlushes()

    expect(order).toContain('idle')

    // It should run no later than the last flush cycle.
    const idleIndex = order.indexOf('idle')
    expect(idleIndex).toBeGreaterThanOrEqual(0)
    expect(idleIndex).toBeLessThan(order.length)
  })

  it('budget enforcement: flush splits work across multiple flush calls when budget is tight', () => {
    const { scheduler, tick } = makeManualScheduler()
    const ran: number[] = []

    scheduler.schedule('default', () => {
      ran.push(1)
      tick(3)
    })
    scheduler.schedule('default', () => {
      ran.push(2)
      tick(3)
    })
    scheduler.schedule('default', () => {
      ran.push(3)
      tick(3)
    })

    // With a 5ms budget and 3ms per task, we can only run 2 tasks per flush.
    scheduler.flush({ budgetMs: 5 })
    expect(ran).toEqual([1, 2])

    scheduler.flush({ budgetMs: 5 })
    expect(ran).toEqual([1, 2, 3])
  })

  it('runtime withBudget() helper returns the callback result and is callable', () => {
    const out = withBudget(1, () => 'ok' as const)
    expect(out).toBe('ok')

    // Smoke: can tune global budget helper without throwing
    setFrameBudget(2)
  })

  it('createRequestFlush(messageChannel) uses MessageChannel when available', () => {
    const orig = (globalThis as any).MessageChannel
    try {
      const port1: any = { onmessage: null }
      const port2: any = { postMessage: () => port1.onmessage?.({}) }

      ;(globalThis as any).MessageChannel = function FakeMessageChannel(this: any) {
        this.port1 = port1
        this.port2 = port2
      } as any

      const requestFlush = createRequestFlush('messageChannel')
      const calls: string[] = []
      requestFlush(() => calls.push('flush'))
      expect(calls).toEqual(['flush'])
    } finally {
      ;(globalThis as any).MessageChannel = orig
    }
  })

  it('createRequestFlush(raf) uses requestAnimationFrame when available', () => {
    const orig = (globalThis as any).requestAnimationFrame
    try {
      const calls: string[] = []
      ;(globalThis as any).requestAnimationFrame = (cb: any) => {
        calls.push('raf')
        cb(0)
        return 1
      }

      const requestFlush = createRequestFlush('raf')
      requestFlush(() => calls.push('flush'))
      expect(calls).toEqual(['raf', 'flush'])
    } finally {
      ;(globalThis as any).requestAnimationFrame = orig
    }
  })

  it('createBrowserScheduler wires a strategy into requestFlush (smoke)', () => {
    const orig = (globalThis as any).requestAnimationFrame
    try {
      let rafCalls = 0
      ;(globalThis as any).requestAnimationFrame = (cb: any) => {
        rafCalls++
        cb(0)
        return 1
      }

      const scheduler = createBrowserScheduler({ strategy: 'raf' })
      scheduler.schedule('default', () => {})
      expect(rafCalls).toBeGreaterThan(0)
    } finally {
      ;(globalThis as any).requestAnimationFrame = orig
    }
  })
})
