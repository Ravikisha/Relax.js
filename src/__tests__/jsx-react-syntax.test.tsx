import { describe, expect, test, vi } from 'vitest'

import { mountDOM } from '../mount-dom'
import { patchDOM } from '../patch-dom'
import { destroyDOM } from '../destroy-dom'
import { defineComponent } from '../component'
import { hFragment } from '../h'

/**
 * Contract:
 * - TSX syntax should work with IntrinsicElements (div/span/button/etc)
 * - props: className, id, data-*
 * - events: onClick
 * - children: strings, expressions, arrays (via {items.map(...)})
 * - Fragment syntax: <>...</>
 */

describe('JSX/TSX React-like syntax', () => {
  test('mounts intrinsic element with props and text children', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const host = document.getElementById('app') as HTMLElement

    const vdom = <div id="root" className="hello">Hello</div>
    mountDOM(vdom as any, host)

  const el = host.firstElementChild as HTMLElement
  expect(el.tagName.toLowerCase()).toBe('div')
  expect(el.id).toBe('root')
  expect(el.className).toBe('hello')
  expect(el.textContent).toBe('Hello')
    destroyDOM(vdom as any)
  })

  test('supports fragments (<>...</>)', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const host = document.getElementById('app') as HTMLElement

    const vdom = (
      <>
        <span>A</span>
        <span>B</span>
      </>
    )

    mountDOM(vdom as any, host)
    expect(host.innerHTML).toBe('<span>A</span><span>B</span>')
    destroyDOM(vdom as any)
  })

  test('supports event handlers via onClick', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const host = document.getElementById('app') as HTMLElement

    const onClick = vi.fn()
    const vdom = <button onClick={onClick}>Hit</button>

    mountDOM(vdom as any, host)

    const btn = host.querySelector('button') as HTMLButtonElement
    btn.click()

    expect(onClick).toHaveBeenCalledTimes(1)
    destroyDOM(vdom as any)
  })

  test('supports list rendering with {items.map(...) }', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const host = document.getElementById('app') as HTMLElement

    const items = ['a', 'b', 'c']

    const vdom = (
      <ul>
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    )

    mountDOM(vdom as any, host)
    expect(host.innerHTML).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>')

    destroyDOM(vdom as any)
  })

  test('patches TSX trees', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const host = document.getElementById('app') as HTMLElement

    let vdom: any = <div className="a">A</div>
    mountDOM(vdom, host)
    expect(host.innerHTML).toBe('<div class="a">A</div>')

    const next: any = <div className="b">B</div>
  patchDOM(vdom, next, host)
    vdom = next

    expect(host.innerHTML).toBe('<div class="b">B</div>')
    destroyDOM(vdom)
  })

  test('supports TSX for components', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const host = document.getElementById('app') as HTMLElement

    const Hello = defineComponent({
      render(this: any) {
        return <div className="hello">Hello {this.props.name}</div>
      },
    })

    const vdom = <Hello name="Relax" />
    mountDOM(vdom as any, host)

    expect(host.innerHTML).toBe('<div class="hello">Hello Relax</div>')
    destroyDOM(vdom as any)
  })

  test('JSX fragment fallback works via hFragment directly', () => {
    // This ensures the underlying Fragment representation is compatible with runtime helpers.
  const vdom = hFragment(['x', <span>y</span>])
    expect(vdom).toBeTruthy()
  })
})
