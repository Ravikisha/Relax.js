import { describe, expect, it } from 'vitest'
import { defineBlock, mountCompiledBlock } from '../block'
import { hydrateBlock } from '../hydration'
import { createSignal } from '../signals'
import { renderBlockToString } from '../ssr'

describe('runtime/ssr (phase 4)', () => {
  it('renders a block to HTML string, hydrates it, and updates via mountCompiledBlock', () => {
    const block = defineBlock({
      templateHTML: `<div class="c"><button id="inc">+</button><span id="t"> </span></div>`,
      slots: {
        value: { kind: 'text', path: [1, 0] },
      },
    })

    const html = renderBlockToString(block, { initialValues: { value: 'A' } })

    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)

    const rootBefore = host.firstElementChild
    const textBefore = host.querySelector('#t')?.firstChild

    const hydrated = hydrateBlock(block, host)

    expect(host.firstElementChild).toBe(rootBefore)
    expect(host.querySelector('#t')?.firstChild).toBe(textBefore)
    expect(host.textContent).toContain('A')

    const [count, setCount] = createSignal('A')
    const mounted = mountCompiledBlock(block, host, [{ key: 'value', read: () => count() }])

    setCount('B')

    // mountCompiledBlock initial run is immediate; updates schedule, but this test suite
    // generally relies on jsdom + microtask scheduling. The text should update by the end
    // of the tick.
    mounted.update({ value: 'B' })

    expect(host.textContent).toContain('B')

    mounted.dispose()
    hydrated.destroy()
  })
})
