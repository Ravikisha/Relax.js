import { describe, expect, it } from 'vitest'
import { defineBlock, mountBlock, mountCompiledBlock, mountNestedBlock, mountNestedFallback, resolvePath } from '../block'
import { createSignal } from '../signals'
import { mountFallback } from '../fallback'

function host() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('runtime/block (phase 3)', () => {
  it('mounts a template and updates text slots by path', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<div>Hello <span><!--x--></span></div>`,
      // div.childNodes = [Text("Hello "), span]
      // span.childNodes = [Comment]
      // We'll target the span itself and replace its textContent via a Text slot resolved to a Text node.
      slots: {
        // Path to the Text node inside span after we mount: create a text node by setting span.textContent first.
        // Since our runtime expects an existing Text node, we use a template with a real text node.
        name: { kind: 'text', path: [1, 0] },
      },
    })

    // Use a template with an actual text node at [1,0]
    const block2 = defineBlock({
      templateHTML: `<div>Hello <span>world</span></div>`,
      slots: {
        name: { kind: 'text', path: [1, 0] },
      },
    })

    const mounted = mountBlock(block2, h, { name: 'Ravi' })

    expect(h.textContent).toBe('Hello Ravi')

    mounted.update({ name: 'Relax' })
    expect(h.textContent).toBe('Hello Relax')

    mounted.destroy()
    expect(h.textContent).toBe('')
  })

  it('updates attribute slots by path', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<a>link</a>`,
      slots: {
        href: { kind: 'attr', path: [], name: 'href' },
      },
    })

    const mounted = mountBlock(block, h, { href: 'https://example.com' })
    const a = h.querySelector('a')!
    expect(a.getAttribute('href')).toBe('https://example.com')

    mounted.update({ href: null })
    expect(a.hasAttribute('href')).toBe(false)
  })

  it('updates property slots by path', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<input />`,
      slots: {
        value: { kind: 'prop', path: [], name: 'value' },
      },
    })

    const mounted = mountBlock(block, h, { value: 'a' })
    const input = h.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('a')

    mounted.update({ value: 'b' })
    expect(input.value).toBe('b')
  })

  it('updates class/style slots by path', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<div></div>`,
      slots: {
        class: { kind: 'class', path: [] },
        style: { kind: 'style', path: [] },
      },
    })

    const mounted = mountBlock(block, h, {
      class: ['a', 'b'],
      style: { color: 'red' },
    })

    const div = h.querySelector('div') as HTMLDivElement
    expect(div.className).toBe('a b')
    expect(div.style.color).toBe('red')

    mounted.update({ class: null, style: null })
    expect(div.getAttribute('class')).toBe(null)
    expect(div.getAttribute('style')).toBe(null)
  })

  it('supports event slots: binds once and updates handler without leaking listeners', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<button>ok</button>`,
      slots: {
        onClick: { kind: 'event', path: [], name: 'click' },
      },
    })

    const calls: string[] = []
    const mounted = mountBlock(block, h, {
      onClick: () => calls.push('a'),
    })

    const btn = h.querySelector('button') as HTMLButtonElement
    btn.click()
    expect(calls).toEqual(['a'])

    mounted.update({
      onClick: () => calls.push('b'),
    })

    btn.click()
    expect(calls).toEqual(['a', 'b'])

    mounted.destroy()
    // After destroy, it should not call new handlers.
    btn.click()
    expect(calls).toEqual(['a', 'b'])
  })

  it('treats boolean attributes as present/absent (attr slots)', () => {
    const h = host()
    const block = defineBlock({
      templateHTML: `<input />`,
      slots: {
        disabled: { kind: 'attr', path: [], name: 'disabled' },
      },
    })

    const mounted = mountBlock(block, h, { disabled: true })
    const input = h.querySelector('input')!
    expect(input.hasAttribute('disabled')).toBe(true)

    mounted.update({ disabled: false })
    expect(input.hasAttribute('disabled')).toBe(false)
  })

  it('updates input value/checked via property semantics for prop slots', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<div><input id="t" /><input id="c" type="checkbox" /></div>`,
      slots: {
        value: { kind: 'prop', path: [0], name: 'value' },
        checked: { kind: 'prop', path: [1], name: 'checked' },
      },
    })

    const mounted = mountBlock(block, h, { value: 'a', checked: true })
    const t = h.querySelector('#t') as HTMLInputElement
    const c = h.querySelector('#c') as HTMLInputElement

    expect(t.value).toBe('a')
    expect(c.checked).toBe(true)

    mounted.update({ value: null, checked: 0 })
    expect(t.value).toBe('')
    expect(c.checked).toBe(false)
  })

  it('sets xlink:* attributes with the xlink namespace on SVG elements', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<svg xmlns="http://www.w3.org/2000/svg"><a></a></svg>`,
      slots: {
        href: { kind: 'attr', path: [0], name: 'xlink:href' },
      },
    })

    const mounted = mountBlock(block, h, { href: '#x' })
    const a = h.querySelector('a') as any

    // namespaceURI for xlink href
    expect(a.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#x')

    mounted.update({ href: null })
    expect(a.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(null)
  })

  it('resolvePath walks childNodes indices', () => {
    const root = document.createElement('div')
    root.innerHTML = `<span>hi</span>`

    const span = resolvePath(root, [0])
    expect((span as Element).tagName.toLowerCase()).toBe('span')

    const text = resolvePath(root, [0, 0])
    expect(text.nodeType).toBe(Node.TEXT_NODE)
    expect((text as Text).nodeValue).toBe('hi')
  })

  it('mountBlock caches repeated path prefixes across slots', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<div><span>a</span><span>b</span></div>`,
      slots: {
        a: { kind: 'text', path: [0, 0] },
        b: { kind: 'text', path: [1, 0] },
      },
    })

    const mounted = mountBlock(block, h)
    // Implementation detail: cache lives on the instance root.
    const cache = (mounted.root as any).__hrbrPathCache as Map<string, Node>
    expect(cache).toBeInstanceOf(Map)
    // Prefixes for both paths should exist.
    expect(cache.has('0')).toBe(true)
    expect(cache.has('0.0')).toBe(true)
    expect(cache.has('1')).toBe(true)
    expect(cache.has('1.0')).toBe(true)

    mounted.destroy()
  })

  it('dev diagnostics: mountBlock includes slot key in invalid path errors (dev mode)', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<div><span>a</span></div>`,
      slots: {
        name: { kind: 'text', path: [9, 0] },
      },
    })

    expect(() => mountBlock(block, h, {}, { dev: true })).toThrow(/slot 'name'/)
  })

  it('changing a signal updates only the intended DOM node (mountCompiledBlock)', async () => {
    const h = host()

    const [a, setA] = createSignal('A')
    const [b, setB] = createSignal('B')

    const block = defineBlock({
      templateHTML: `<div><span>A</span><span>B</span></div>`,
      slots: {
        a: { kind: 'text', path: [0, 0] },
        b: { kind: 'text', path: [1, 0] },
      },
    })

    const mounted = mountCompiledBlock(block, h, [
      { key: 'a', read: () => a() },
      { key: 'b', read: () => b() },
    ])

  const spans = () => Array.from(h.querySelectorAll('span')) as HTMLSpanElement[]
  const initialSpans = spans()
  expect(initialSpans).toHaveLength(2)
  const s1 = initialSpans[0]!
  const s2 = initialSpans[1]!
    expect(s1.textContent).toBe('A')
    expect(s2.textContent).toBe('B')

    const nodeA = s1.firstChild
    const nodeB = s2.firstChild

    setA('A2')
    await new Promise((r) => setTimeout(r, 0))

  const nextSpans = spans()
  expect(nextSpans).toHaveLength(2)
  const s1b = nextSpans[0]!
  const s2b = nextSpans[1]!
    expect(s1b.textContent).toBe('A2')
    expect(s2b.textContent).toBe('B')
    expect(s1b.firstChild).toBe(nodeA)
    expect(s2b.firstChild).toBe(nodeB)

    mounted.dispose()
  })

  it('mounting does not recreate static DOM during updates', async () => {
    const h = host()

    const [name, setName] = createSignal('A')

    const block = defineBlock({
      templateHTML: `<div><p id="static">static</p><span>A</span></div>`,
      slots: {
        name: { kind: 'text', path: [1, 0] },
      },
    })

    const mounted = mountCompiledBlock(block, h, [{ key: 'name', read: () => name() }])

    const root = h.firstElementChild as HTMLElement
    const staticP = root.querySelector('#static') as HTMLParagraphElement
    const span = root.querySelector('span') as HTMLSpanElement
    const textNode = span.firstChild

    expect(staticP.textContent).toBe('static')
    expect(span.textContent).toBe('A')

    setName('B')
    await new Promise((r) => setTimeout(r, 0))

    const root2 = h.firstElementChild as HTMLElement
    const staticP2 = root2.querySelector('#static') as HTMLParagraphElement
    const span2 = root2.querySelector('span') as HTMLSpanElement

    // same elements and same text-node identity; only content changes
    expect(root2).toBe(root)
    expect(staticP2).toBe(staticP)
    expect(span2).toBe(span)
    expect(span2.firstChild).toBe(textNode)
    expect(span2.textContent).toBe('B')

    mounted.dispose()
  })

  it('skips redundant writes for unchanged values (text + attr)', () => {
    const h = host()

    const block = defineBlock({
      templateHTML: `<div><span>hi</span><a>link</a></div>`,
      slots: {
        text: { kind: 'text', path: [0, 0] },
        href: { kind: 'attr', path: [1], name: 'href' },
      },
    })

    const mounted = mountBlock(block, h, { text: 'X', href: 'y' })
    const root = mounted.root as HTMLElement
    const span = root.querySelector('span')!
    const a = root.querySelector('a')!
    const textNode = span.firstChild

    // Same values again should be a no-op.
    mounted.update({ text: 'X', href: 'y' })
    expect(span.firstChild).toBe(textNode)
    expect(a.getAttribute('href')).toBe('y')

    mounted.destroy()
  })

  it('skips redundant event listener churn when handler identity is unchanged', () => {
    const h = host()
    const block = defineBlock({
      templateHTML: `<button>ok</button>`,
      slots: {
        onClick: { kind: 'event', path: [], name: 'click' },
      },
    })

    const calls: string[] = []
    const fn = () => calls.push('x')
    const mounted = mountBlock(block, h, { onClick: fn })

    const btn = h.querySelector('button') as HTMLButtonElement
    btn.click()
    expect(calls).toEqual(['x'])

    // Update with the same function reference: should not remove/re-add.
    mounted.update({ onClick: fn })
    btn.click()
    expect(calls).toEqual(['x', 'x'])

    mounted.destroy()
  })

  it('block composition: can mount a nested block into an element slot and destroys it with parent', () => {
    const h = host()

    const parent = defineBlock({
      templateHTML: `<div><div id="slot"></div></div>`,
      slots: {
        slot: { kind: 'prop', path: [0], name: 'id' },
        mountPoint: { kind: 'attr', path: [0], name: 'data-mount' },
      },
    })

    // We'll mount into the actual element at path [0] by directly using slotNodes.
    const hostBlock = mountBlock(
      defineBlock({
        templateHTML: `<div><div id="mount"></div></div>`,
        slots: {
          mount: { kind: 'attr', path: [0], name: 'data-mount' },
        },
      }),
      h
    )

    // Create a nested block and mount into the <div id="mount"> element.
    const child = defineBlock({
      templateHTML: `<span>child</span>`,
      slots: {},
    })

    const root = hostBlock.root as HTMLElement
    const mountEl = root.querySelector('#mount') as HTMLDivElement
    expect(mountEl).toBeTruthy()

    // Wire slotNodes for mountNestedBlock by registering a synthetic slot.
    ;(hostBlock.slotNodes as any).mountEl = mountEl
    mountNestedBlock(hostBlock, 'mountEl', child)
    expect(root.textContent).toContain('child')

    hostBlock.destroy()
    expect(h.textContent).toBe('')
  })

  it('block composition: can mount a nested fallback region into an element slot and disposes it with parent', async () => {
    const h = host()
    const [flag, setFlag] = createSignal(true)

    const parent = mountBlock(
      defineBlock({
        templateHTML: `<div><div id="mount"></div></div>`,
        slots: {},
      }),
      h
    )

    const root = parent.root as HTMLElement
    const mountEl = root.querySelector('#mount') as HTMLDivElement
    ;(parent.slotNodes as any).mountEl = mountEl

    mountNestedFallback(parent, 'mountEl', (hostEl) =>
      mountFallback(hostEl, () => ({
        children: flag()
          ? [{ kind: 'node', key: 'a', create: () => document.createTextNode('A'), patch: () => {} }]
          : [{ kind: 'node', key: 'b', create: () => document.createTextNode('B'), patch: () => {} }],
      }))
    )

    expect(root.textContent).toContain('A')
    setFlag(false)
    await new Promise((r) => setTimeout(r, 0))
    expect(root.textContent).toContain('B')

    parent.destroy()
    // After destroy, host is removed entirely.
    expect(h.textContent).toBe('')
  })

  it('lifecycle: destroy() is idempotent and prevents further updates', () => {
    const h = host()
    const block = defineBlock({
      templateHTML: `<div><span>A</span></div>`,
      slots: { t: { kind: 'text', path: [0, 0] } },
    })
    const mounted = mountBlock(block, h, { t: 'A' })
    mounted.destroy()
    // second destroy should be a no-op (no throw)
    mounted.destroy()
    // update after destroy should be ignored
    mounted.update({ t: 'B' })
    expect(h.textContent).toBe('')
  })

  it('lifecycle: mountCompiledBlock.dispose() stops reactive updates and is idempotent', async () => {
    const h = host()
    const [a, setA] = createSignal('A')

    const block = defineBlock({
      templateHTML: `<div><span>A</span></div>`,
      slots: { a: { kind: 'text', path: [0, 0] } },
    })

    const mounted = mountCompiledBlock(block, h, [{ key: 'a', read: () => a() }])
    expect(h.textContent).toBe('A')

    mounted.dispose()
    mounted.dispose()

    setA('B')
    await new Promise((r) => setTimeout(r, 0))
    // DOM removed, and no further updates should occur.
    expect(h.textContent).toBe('')
  })
})
