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

  it('hydrates with full slot semantics (event/attr/prop/SVG) without rewriting existing DOM', () => {
    const block = defineBlock({
      templateHTML: `<div><button id="b"></button><input id="i" type="checkbox"/><svg><a></a></svg></div>`,
      slots: {
        onClick: { kind: 'event', name: 'click', path: [0] },
        hidden: { kind: 'attr', name: 'hidden', path: [0] },
        checked: { kind: 'prop', name: 'checked', path: [1] },
        href: { kind: 'attr', name: 'xlink:href', path: [2, 0] },
      },
    })

    const host = hostWithHTML(`<div><button id="b"></button><input id="i" type="checkbox"><svg><a></a></svg></div>`)
    const rootBefore = host.firstElementChild
    const btnBefore = host.querySelector('#b')
    const inputBefore = host.querySelector('#i')
    const linkBefore = host.querySelector('svg a')

    let clicks = 0
    const hydrated = hydrateBlock(block, host)
    hydrated.update({
      onClick: () => clicks++,
      hidden: true,
      checked: true,
      href: '#x',
    })

    expect(host.firstElementChild).toBe(rootBefore)
    expect(host.querySelector('#b')).toBe(btnBefore)
    expect(host.querySelector('#i')).toBe(inputBefore)
    expect(host.querySelector('svg a')).toBe(linkBefore)

    ;(btnBefore as HTMLButtonElement).click()
    expect(clicks).toBe(1)
    expect((btnBefore as HTMLButtonElement).hasAttribute('hidden')).toBe(true)
    expect((inputBefore as HTMLInputElement).checked).toBe(true)

    // xlink:href should be set in the xlink namespace for SVG.
    expect((linkBefore as Element).getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#x')

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

  it('slot path element mismatch triggers bailout remount (conservative)', () => {
    const block = defineBlock({
      templateHTML: `<div><span></span></div>`,
      slots: {
    cls: { kind: 'class', path: [0] },
      },
    })

  // Same root tag, but span is replaced with em => should bail.
    const host = hostWithHTML(`<div><em>X</em></div>`)
    const rootBefore = host.firstElementChild

  const hydrated = hydrateBlock(block, host, { cls: 'x' })

    // Remount should replace root.
    expect(host.firstElementChild).not.toBe(rootBefore)
    expect(host.firstElementChild?.tagName.toLowerCase()).toBe('div')
    expect(host.querySelector('span')).not.toBeNull()
  expect((host.querySelector('span') as Element).getAttribute('class')).toBe('x')

    hydrated.destroy()
  })
})
