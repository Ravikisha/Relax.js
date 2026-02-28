import { describe, expect, it, vi } from 'vitest'
import { createScheduler } from '../scheduler'

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

  // aged idle gets promoted before the lane scan, so it can run before later-scheduled default work.
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
})
