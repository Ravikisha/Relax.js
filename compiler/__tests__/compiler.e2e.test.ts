import { describe, expect, it } from 'vitest'
import { compileTSXToBlock } from '../index'
import { createSignal } from '../../runtime/signals'
import { mountCompiledBlock } from '../../runtime/block'

function microtask() {
  return Promise.resolve()
}

function tick() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('compiler (phase 5): end-to-end (no VDOM)', () => {
  it('updates a compiled block from signals without recreating the root element', async () => {
    const host = document.createElement('div')

    const [count, setCount] = createSignal(1)

  const { block } = compileTSXToBlock(`(<div className={count()}>Count</div>)`)

    const mounted = mountCompiledBlock(block, host, [{ key: 's0', read: () => count() }])

    const root1 = host.firstElementChild
    expect(root1).toBeTruthy()
    expect((root1 as Element).getAttribute('class')).toBe('1')

    setCount(2)
  // HRBR scheduler uses setTimeout(0) by default.
  await microtask()
  await tick()

    const root2 = host.firstElementChild
    expect(root2).toBe(root1)
    expect((root2 as Element).getAttribute('class')).toBe('2')

    mounted.dispose()
  })
})
