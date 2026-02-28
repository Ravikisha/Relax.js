import { describe, expect, it } from 'vitest'

import { createSignal, createEffect, batch } from '../signals'
import { createScheduler } from '../scheduler'
import { defineBlock, mountBlock } from '../block'
import { getDevtoolsCounters, resetDevtoolsCounters } from '../devtools'

function host() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('runtime/devtools (optional)', () => {
  it('counts slot writes when mountBlock applies updates', () => {
    resetDevtoolsCounters()
    const h = host()

    const block = defineBlock({
      templateHTML: `<div><span> </span></div>`,
      slots: {
        // root <div> -> first child <span> -> its text node
        text: { kind: 'text', path: [0, 0] },
      },
    })

    const mounted = mountBlock(block, h, { text: 'a' })
    mounted.update({ text: 'b' })

    const c = getDevtoolsCounters()
    expect(c.slotWrites).toBeGreaterThanOrEqual(2) // initial + update
  })

  it('counts scheduled computations and flush duration for non-sync effects', async () => {
    resetDevtoolsCounters()

    // Deterministic: use an instrumented runtime scheduler directly.
    const sched = createScheduler({ requestFlush: (cb) => cb() })
    sched.schedule('default', () => {}, 1)

    // Also ensure we exercise a signals schedule path (counted independently).
    const [count, setCount] = createSignal(0)
    createEffect(() => {
      count()
    })
    batch(() => setCount(1))

    await Promise.resolve()

    const c = getDevtoolsCounters()
  expect(c.scheduledComputations).toBeGreaterThan(0)
    expect(c.flushes).toBeGreaterThan(0)
    expect(c.flushTimeMs).toBeGreaterThanOrEqual(0)
  })
})
