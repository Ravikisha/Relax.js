import { describe, expect, it } from 'vitest'
import { defineBlock } from '../block'
import { hydrateBlock } from '../hydration'

function hostWithHTML(html: string) {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('runtime/hydration (phase 4)', () => {
  it('hydrates without rewriting DOM when markup matches', () => {
    const block = defineBlock({
      templateHTML: `<div><span>A</span></div>`,
      slots: {
        a: { kind: 'text', path: [0, 0] },
      },
    })

    const host = hostWithHTML(`<div><span>A</span></div>`)
    const rootBefore = host.firstElementChild
    const spanBefore = host.querySelector('span')
    const textBefore = spanBefore?.firstChild

    const hydrated = hydrateBlock(block, host, { a: 'B' })

    expect(host.firstElementChild).toBe(rootBefore)
    expect(host.querySelector('span')).toBe(spanBefore)
    expect(host.querySelector('span')?.firstChild).toBe(textBefore)
    expect(host.textContent).toBe('B')

    hydrated.destroy()
  })

  it('mismatch triggers remount for subtree', () => {
    const block = defineBlock({
      templateHTML: `<div><span>A</span></div>`,
      slots: {
        a: { kind: 'text', path: [0, 0] },
      },
    })

    // wrong root tag
    const host = hostWithHTML(`<section><span>A</span></section>`)

    const rootBefore = host.firstElementChild

    const hydrated = hydrateBlock(block, host, { a: 'X' })

    const rootAfter = host.firstElementChild
    expect(rootAfter).not.toBe(rootBefore)
    expect(rootAfter?.tagName.toLowerCase()).toBe('div')
    expect(host.textContent).toBe('X')

    hydrated.destroy()
  })
})
