import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent } from '../component'
import { h, hFragment, hString } from '../h'
import { mountDOM } from '../mount-dom'
import { patchDOM } from '../patch-dom'
import { singleHtmlLine } from './utils'

beforeEach(() => {
  document.body.innerHTML = ''
})

test('no change', async () => {
  const oldVdom = h('div', {}, ['hello'])
  const newVdom = h('div', {}, ['hello'])

  const vdom = await patch(oldVdom, newVdom)

  expect(document.body.innerHTML).toEqual('<div>hello</div>')
  expect(newVdom.el).toBe(vdom.el)
})

test('change the root node', async () => {
  const oldVdom = h('div', {}, ['hello'])
  const newVdom = h('span', {}, ['hello'])

  const vdom = await patch(oldVdom, newVdom)

  expect(document.body.innerHTML).toEqual('<span>hello</span>')
  expect(vdom.el).toBeInstanceOf(HTMLSpanElement)
  expect(newVdom.el).toBe(vdom.el)
})

test('change the root node, mount in same index', async () => {
  const staticVdom = h('p', {}, ['bye'])
  await mountDOM(staticVdom, document.body)

  const oldVdom = h('div', {}, ['hello'])
  const newVdom = h('span', {}, ['hello'])
  await mountDOM(oldVdom, document.body, 0)
  await patchDOM(oldVdom, newVdom, document.body)

  expect(document.body.innerHTML).toEqual('<span>hello</span><p>bye</p>')
})

test('sets the el in the new vdom', async () => {
  const oldVdom = h('div', {}, ['hello'])
  const newVdom = h('div', {}, ['hello'])

  const vdom = await patch(oldVdom, newVdom)

  expect(newVdom.el).toBe(vdom.el)
})

test('patch text', async () => {
  const oldVdom = hString('foo')
  const newVdom = hString('bar')

  await patch(oldVdom, newVdom)

  expect(document.body.innerHTML).toEqual('bar')
})

describe('patch fragments', () => {
  test('nested fragments, add child', async () => {
    const oldVdom = hFragment([hFragment([hString('foo')])])
    const newVdom = hFragment([
      hFragment([hString('foo'), hString('bar')]),
      h('p', {}, ['baz']),
    ])

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('foobar<p>baz</p>')
  })

  test('nested fragments, add child at index', async () => {
    const oldVdom = hFragment([
      hString('A'),
      hFragment([hString('B'), hString('C')]),
    ])
    const newVdom = hFragment([
      hFragment([hString('X')]),
      hString('A'),
      hFragment([hString('B'), hFragment([hString('Y')]), hString('C')]),
    ])

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('XABYC')
  })

  test('nested fragments, remove child', async () => {
    const oldVdom = hFragment([
      hFragment([hString('X')]),
      hString('A'),
      hFragment([hString('B'), hFragment([hString('Y')]), hString('C')]),
    ])
    const newVdom = hFragment([
      hString('A'),
      hFragment([hString('B'), hString('C')]),
    ])

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('ABC')
  })

  test('nested fragments, move child', async () => {
    const oldVdom = hFragment([
      hString('A'),
      hFragment([hString('B'), hString('C')]),
    ])
    const newVdom = hFragment([
      hFragment([hString('B')]),
      hString('A'),
      hFragment([hString('C')]),
    ])

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('BAC')
  })
})

describe('patch attributes', () => {
  test('add attribute', async () => {
    const oldVdom = h('div', {})
    const newVdom = h('div', { id: 'foo' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('<div id="foo"></div>')
  })

  test('remove attribute', async () => {
    const oldVdom = h('div', { id: 'foo' })
    const newVdom = h('div', {})

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('<div></div>')
  })

  test('update the value of an attribute', async () => {
    const oldVdom = h('div', { id: 'foo' })
    const newVdom = h('div', { id: 'bar' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('<div id="bar"></div>')
  })
})

describe('patch class', () => {
  test('from empty string to string', async () => {
    const oldVdom = h('div', { class: '' })
    const newVdom = h('div', { class: 'foo' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('<div class="foo"></div>')
  })

  test('from string to empty string', async () => {
    const oldVdom = h('div', { class: 'foo' })
    const newVdom = h('div', { class: '' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('<div class=""></div>')
  })

  test('from no class to string', async () => {
    const oldVdom = h('div', {})
    const newVdom = h('div', { class: 'foo' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('<div class="foo"></div>')
  })

  test('from string to no class', async () => {
    const oldVdom = h('div', { class: 'foo' })
    const newVdom = h('div', {})

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toEqual('<div class=""></div>')
  })

  test('change string value', async () => {
    const oldVdom = h('div', { class: 'foo' })
    const newVdom = h('div', { class: 'bar' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="bar"></div>')
  })

  test('from a string to an array of classes', async () => {
    const oldVdom = h('div', { class: 'foo' })
    const newVdom = h('div', { class: ['foo', 'bar'] })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="foo bar"></div>')
  })

  test('from an array of classes to a string', async () => {
    const oldVdom = h('div', { class: ['foo', 'bar'] })
    const newVdom = h('div', { class: 'foo' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="foo"></div>')
  })

  test('from an array of classes to a string', async () => {
    const oldVdom = h('div', { class: ['foo', 'bar'] })
    const newVdom = h('div', { class: 'foo' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="foo"></div>')
  })

  test('add class to array', async () => {
    const oldVdom = h('div', { class: ['foo'] })
    const newVdom = h('div', { class: ['foo', 'bar'] })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="foo bar"></div>')
  })

  test('remove class from array', async () => {
    const oldVdom = h('div', { class: ['foo', 'bar'] })
    const newVdom = h('div', { class: ['foo'] })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="foo"></div>')
  })

  test('add class to string', async () => {
    const oldVdom = h('div', { class: 'foo' })
    const newVdom = h('div', { class: 'foo bar' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="foo bar"></div>')
  })

  test('remove class from string', async () => {
    const oldVdom = h('div', { class: 'foo bar' })
    const newVdom = h('div', { class: 'foo' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div class="foo"></div>')
  })
})

describe('patch style', () => {
  test('add a new style', async () => {
    const oldVdom = h('div')
    const newVdom = h('div', { style: { color: 'red' } })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div style="color: red;"></div>')
  })

  test('remove a style', async () => {
    const oldVdom = h('div', { style: { color: 'red' } })
    const newVdom = h('div')

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div style=""></div>')
  })

  test('change a style', async () => {
    const oldVdom = h('div', { style: { color: 'red' } })
    const newVdom = h('div', { style: { color: 'blue' } })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<div style="color: blue;"></div>')
  })
})

describe('patch event handlers', () => {
  test('update event handler', async () => {
    const oldHandler = vi.fn()
    const oldVdom = h('button', { on: { click: oldHandler } }, ['Click me'])
    const newHandler = vi.fn()
    const newVdom = h('button', { on: { click: newHandler } }, ['Click me'])

    await patch(oldVdom, newVdom)

    ;(document.body.querySelector('button') as HTMLButtonElement).click()

    expect(oldHandler).not.toHaveBeenCalled()
    expect(newHandler).toHaveBeenCalled()
    expect((newVdom as any).listeners).not.toBeUndefined()
  })

  test('remove event handler', async () => {
    const oldHandler = vi.fn()
    const oldVdom = h('button', { on: { click: oldHandler } }, ['Click me'])
    const newVdom = h('button', {}, ['Click me'])

    await patch(oldVdom, newVdom)

    ;(document.body.querySelector('button') as HTMLButtonElement).click()

    expect(oldHandler).not.toHaveBeenCalled()
    expect((newVdom as any).listeners).toStrictEqual({})
  })
})

describe('patch children', () => {
  describe('text vnode', () => {
    test('added at the end', async () => {
      const oldVdom = h('div', {}, ['A'])
      const newVdom = h('div', {}, ['A', 'B'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>AB</div>')
    })

    test('added at the beginning', async () => {
      const oldVdom = h('div', {}, ['B'])
      const newVdom = h('div', {}, ['A', 'B'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>AB</div>')
    })

    test('added in the middle', async () => {
      const oldVdom = h('div', {}, ['A', 'B'])
      const newVdom = h('div', {}, ['A', 'B', 'C'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>ABC</div>')
    })

    test('removed from the end', async () => {
      const oldVdom = h('div', {}, ['A', 'B'])
      const newVdom = h('div', {}, ['A'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>A</div>')
    })

    test('removed from the beginning', async () => {
      const oldVdom = h('div', {}, ['A', 'B'])
      const newVdom = h('div', {}, ['B'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>B</div>')
    })

    test('removed from the middle', async () => {
      const oldVdom = h('div', {}, ['A', 'B', 'C'])
      const newVdom = h('div', {}, ['A', 'C'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>AC</div>')
    })

    test('changed', async () => {
      const oldVdom = h('div', {}, ['A'])
      const newVdom = h('div', {}, ['B'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>B</div>')
    })

    test('moved around', async () => {
      const oldVdom = h('div', {}, ['A', 'B', 'C'])
      const newVdom = h('div', {}, ['C', 'A', 'B'])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>CAB</div>')
    })

    test('recursively', async () => {
      const oldVdom = hFragment([
        h('p', {}, ['A']),
        h('span', {}, ['B']),
        h('div', {}, ['C']),
      ])
      const newVdom = hFragment([
        h('div', {}, ['C']),
        h('span', { id: 'b' }, ['B']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div>C</div><span id="b">B</span>')
    })
  })

  describe('element vnode', () => {
    test('added at the end', async () => {
      const oldVdom = h('div', {}, [h('span', {}, ['A'])])
      const newVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', { id: 'b' }, ['B']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe(
        '<div><span>A</span><span id="b">B</span></div>'
      )
    })

    test('added at the beginning', async () => {
      const oldVdom = h('div', {}, [h('span', {}, ['B'])])
      const newVdom = h('div', {}, [
        h('span', { id: 'a' }, ['A']),
        h('span', {}, ['B']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe(
        '<div><span id="a">A</span><span>B</span></div>'
      )
    })

    test('added in the middle', async () => {
      const oldVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', {}, ['C']),
      ])
      const newVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', { id: 'b' }, ['B']),
        h('span', {}, ['C']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe(
        '<div><span>A</span><span id="b">B</span><span>C</span></div>'
      )
    })

    test('removed from the end', async () => {
      const oldVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', {}, ['B']),
      ])
      const newVdom = h('div', {}, [h('span', {}, ['A'])])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div><span>A</span></div>')
    })

    test('removed from the beginning', async () => {
      const oldVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', {}, ['B']),
      ])
      const newVdom = h('div', {}, [h('span', {}, ['B'])])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<div><span>B</span></div>')
    })

    test('removed from the middle', async () => {
      const oldVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', {}, ['B']),
        h('span', {}, ['C']),
      ])
      const newVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', {}, ['C']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe(
        '<div><span>A</span><span>C</span></div>'
      )
    })

    test('moved around', async () => {
      const oldVdom = h('div', {}, [
        h('span', {}, ['A']),
        h('span', {}, ['B']),
        h('span', {}, ['C']),
      ])
      const newVdom = h('div', {}, [
        h('span', {}, ['C']),
        h('span', {}, ['A']),
        h('span', {}, ['B']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe(
        '<div><span>C</span><span>A</span><span>B</span></div>'
      )
    })
  })

  describe('fragment vnode', () => {
    test('add element at the end', async () => {
      const oldVdom = hFragment([h('span', {}, ['A'])])
      const newVdom = hFragment([
        h('span', {}, ['A']),
        h('span', { id: 'b' }, ['B']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span>A</span><span id="b">B</span>')
    })

    test('add element at the beginning', async () => {
      const oldVdom = hFragment([h('span', {}, ['B'])])
      const newVdom = hFragment([
        h('span', { id: 'a' }, ['A']),
        h('span', {}, ['B']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span id="a">A</span><span>B</span>')
    })

    test('add element in the middle', async () => {
      const oldVdom = hFragment([
        h('span', {}, ['A']),
        h('span', {}, ['C']),
      ])
      const newVdom = hFragment([
        h('span', {}, ['A']),
        h('span', { id: 'b' }, ['B']),
        h('span', {}, ['C']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span>A</span><span id="b">B</span><span>C</span>')
    })

    test('remove element from the end', async () => {
      const oldVdom = hFragment([
        h('span', {}, ['A']),
        h('span', {}, ['B']),
      ])
      const newVdom = hFragment([h('span', {}, ['A'])])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span>A</span>')
    })

    test('remove element from the beginning', async () => {
      const oldVdom = hFragment([
        h('span', {}, ['A']),
        h('span', {}, ['B']),
      ])
      const newVdom = hFragment([h('span', {}, ['B'])])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span>B</span>')
    })

    test('remove element from the middle', async () => {
      const oldVdom = hFragment([
        h('span', {}, ['A']),
        h('span', {}, ['B']),
        h('span', {}, ['C']),
      ])
      const newVdom = hFragment([
        h('span', {}, ['A']),
        h('span', {}, ['C']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span>A</span><span>C</span>')
    })

    test('append fragment', async () => {
      const oldVdom = hFragment([h('span', {}, ['A'])])
      const newVdom = hFragment([
        h('span', {}, ['A']),
        hFragment([h('span', {}, ['B'])]),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span>A</span><span>B</span>')
    })

    test('move children around', async () => {
      const oldVdom = hFragment([
        h('span', {}, ['A']),
        h('span', {}, ['B']),
        h('span', {}, ['C']),
      ])
      const newVdom = hFragment([
        h('span', {}, ['C']),
        h('span', {}, ['A']),
        h('span', {}, ['B']),
      ])

      await patch(oldVdom, newVdom)

      expect(document.body.innerHTML).toBe('<span>C</span><span>A</span><span>B</span>')
    })
  })
})

describe('patch vdom with component host', () => {
  const component = { count: 5 }
  const props = {
    on: {
      click(this: any) {
        this.count++
      },
    },
  }

  afterEach(() => {
    component.count = 5
  })

  test('when the root node changes, bounds the component to the event handlers', async () => {
    const oldVdom = h('button', {}, ['Click'])
    const newVdom = h('div', props as any, ['Click'])

    await patch(oldVdom, newVdom, component)
    ;(document.querySelector('div') as HTMLDivElement).click()

    expect(document.body.innerHTML).toBe('<div>Click</div>')
    expect(component.count).toBe(6)
  })

  test('when a child node is added, bounds its event handlers to the component', async () => {
    const oldVdom = h('div', {}, ['hi'])
    const newVdom = h('div', {}, ['hi', h('button', props as any, ['Click'])])

    await patch(oldVdom, newVdom, component)
    ;(document.querySelector('button') as HTMLButtonElement).click()

    expect(document.body.innerHTML).toBe('<div>hi<button>Click</button></div>')
    expect(component.count).toBe(6)
  })

  test('when an event is patched, binds the event handler to the component', async () => {
    const oldVdom = h('button', {}, ['Click'])
    const newVdom = h('button', props as any, ['Click'])

    await patch(oldVdom, newVdom, component)
    ;(document.querySelector('button') as HTMLButtonElement).click()

    expect(document.body.innerHTML).toBe('<button>Click</button>')
    expect(component.count).toBe(6)
  })

  test('when a child node is moved, binds its event handlers to the component', async () => {
    const oldVdom = hFragment([
      h('span', {}, ['A']),
      h('button', {}, ['B']),
    ])
    const newVdom = hFragment([
      h('button', props as any, ['B']),
      h('span', {}, ['A']),
    ])

    await patch(oldVdom, newVdom, component)
    ;(document.querySelector('button') as HTMLButtonElement).click()

    expect(document.body.innerHTML).toBe('<button>B</button><span>A</span>')
    expect(component.count).toBe(6)
  })

  test('when a child node is moved naturally (noop), binds its event handlers to the component', async () => {
    const oldVdom = hFragment([h('button', {}, ['A'])])
    const newVdom = hFragment([h('button', props as any, ['A'])])

    await patch(oldVdom, newVdom, component)
    ;(document.querySelector('button') as HTMLButtonElement).click()

    expect(document.body.innerHTML).toBe('<button>A</button>')
    expect(component.count).toBe(6)
  })
})

describe('patch component with props', () => {
  const Component = defineComponent({
    render() {
      return h('span', { class: 'foo' }, [(this as any).props.text])
    },
  })

  test('the new prop is patched into the DOM', async () => {
    const oldVdom = h(Component, { text: 'one' })
    const newVdom = h(Component, { text: 'two' })

    await patch(oldVdom, newVdom)

    expect(document.body.innerHTML).toBe('<span class="foo">two</span>')
  })

  test("the component instance is preserved (the component isn't re-created)", async () => {
    const oldVdom = h(Component, { text: 'one' })
    const newVdom = h(Component, { text: 'two' })

    await patch(oldVdom, newVdom)

    expect((newVdom as any).component).toBe((oldVdom as any).component)
  })
})

describe('patch keyed component list', () => {
  const Component = defineComponent({
    state() {
      return { highlighted: false }
    },

    render() {
      const { highlighted } = (this as any).state
      const { text } = (this as any).props

      return h(
        'span',
        {
          class: highlighted ? 'highlighted' : '',
          id: text,
          on: {
            click: () => (this as any).updateState({ highlighted: !highlighted }),
          },
        },
        [text]
      )
    },
  })

  test('swap two components', async () => {
    const oldVdom = hFragment([
      h(Component, { key: 'a', text: 'A' }),
      h(Component, { key: 'b', text: 'B' }),
    ])
    const newVdom = hFragment([
      h(Component, { key: 'b', text: 'B' }),
      h(Component, { key: 'a', text: 'A' }),
    ])

    await mountDOM(oldVdom, document.body)

    ;(document.querySelector('#A') as HTMLElement).click()
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="B">B</span>
      `
    )

    await patchDOM(oldVdom, newVdom, document.body)

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="B">B</span>
      <span id="A" class="highlighted">A</span>
      `
    )
  })

  test('the key is not passed as prop to the component', async () => {
    const oldVdom = h(Component, { key: 'a', text: 'A' })
    const newVdom = h(Component, { key: 'a', text: 'B' })

    await patch(oldVdom, newVdom)

    const component = (newVdom as any).component
    expect(component.props).toEqual({ text: 'B' })
  })

  test('add a new component in the middle', async () => {
    const oldVdom = hFragment([
      h(Component, { key: 'a', text: 'A' }),
      h(Component, { key: 'b', text: 'B' }),
    ])
    const newVdom = hFragment([
      h(Component, { key: 'a', text: 'A' }),
      h(Component, { key: 'c', text: 'C' }),
      h(Component, { key: 'b', text: 'B' }),
    ])

    await mountDOM(oldVdom, document.body)

    ;(document.querySelector('#A') as HTMLElement).click()
    ;(document.querySelector('#B') as HTMLElement).click()
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="B" class="highlighted">B</span>
      `
    )

    await patchDOM(oldVdom, newVdom, document.body)

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="C">C</span>
      <span id="B" class="highlighted">B</span>
      `
    )
  })

  test('remove a component in the middle', async () => {
    const oldVdom = hFragment([
      h(Component, { key: 'a', text: 'A' }),
      h(Component, { key: 'b', text: 'B' }),
      h(Component, { key: 'c', text: 'C' }),
    ])
    const newVdom = hFragment([
      h(Component, { key: 'a', text: 'A' }),
      h(Component, { key: 'c', text: 'C' }),
    ])

    await mountDOM(oldVdom, document.body)

    ;(document.querySelector('#B') as HTMLElement).click()
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A">A</span>
      <span id="B" class="highlighted">B</span>
      <span id="C">C</span>
      `
    )

    patchDOM(oldVdom, newVdom, document.body)

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A">A</span>
      <span id="C">C</span>
      `
    )
  })

  test("when a component changes its key, loses it's internal state (it's recreated)", async () => {
    const oldVdom = hFragment([
      h(Component, { key: 'a', text: 'A' }),
      h(Component, { key: 'b', text: 'B' }),
    ])
    const newVdom = hFragment([
      h(Component, { key: 'a', text: 'A' }),
      h(Component, { key: 'c', text: 'C' }),
    ])

    await mountDOM(oldVdom, document.body)

    ;(document.querySelector('#A') as HTMLElement).click()
    ;(document.querySelector('#B') as HTMLElement).click()
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="B" class="highlighted">B</span>
      `
    )

    await patchDOM(oldVdom, newVdom, document.body)

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="C">C</span>
      `
    )
  })
})

describe('patchChildren fast path (stable keyed order)', () => {
  test('patches in-place when keys are the same and in the same order', async () => {
    const oldVdom = h('div', {}, [
      h('span', { key: 'a', id: 'a' }, ['A']),
      h('span', { key: 'b', id: 'b' }, ['B']),
      h('span', { key: 'c', id: 'c' }, ['C']),
    ])
    const newVdom = h('div', {}, [
      h('span', { key: 'a', id: 'a' }, ['AA']),
      h('span', { key: 'b', id: 'b' }, ['BB']),
      h('span', { key: 'c', id: 'c' }, ['CC']),
    ])

    await mountDOM(oldVdom, document.body)

    const parentEl = (oldVdom as any).el as HTMLElement
    const a0 = parentEl.querySelector('#a')
    const b0 = parentEl.querySelector('#b')
    const c0 = parentEl.querySelector('#c')

    const insertSpy = vi.spyOn(parentEl, 'insertBefore')
    const removeSpy = vi.spyOn(parentEl, 'removeChild')

    await patchDOM(oldVdom, newVdom, document.body)

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
        <div>
          <span id="a">AA</span>
          <span id="b">BB</span>
          <span id="c">CC</span>
        </div>
      `
    )

    // nodes should be preserved (patched in place)
    expect(parentEl.querySelector('#a')).toBe(a0)
    expect(parentEl.querySelector('#b')).toBe(b0)
    expect(parentEl.querySelector('#c')).toBe(c0)

    // no reorder/mount/unmount should be needed
    expect(insertSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
  })
})

describe('patchChildren keyed reorder fast path (LIS)', () => {
  test('reorders keyed children by moving DOM nodes (no remount)', async () => {
    const oldVdom = h('div', {}, [
      h('span', { key: 'a', id: 'a' }, ['A']),
      h('span', { key: 'b', id: 'b' }, ['B']),
      h('span', { key: 'c', id: 'c' }, ['C']),
      h('span', { key: 'd', id: 'd' }, ['D']),
    ])
    const newVdom = h('div', {}, [
      h('span', { key: 'd', id: 'd' }, ['D']),
      h('span', { key: 'b', id: 'b' }, ['B']),
      h('span', { key: 'a', id: 'a' }, ['A']),
      h('span', { key: 'c', id: 'c' }, ['C']),
    ])

    await mountDOM(oldVdom, document.body)
    const parentEl = (oldVdom as any).el as HTMLElement

    const a0 = parentEl.querySelector('#a')
    const b0 = parentEl.querySelector('#b')
    const c0 = parentEl.querySelector('#c')
    const d0 = parentEl.querySelector('#d')

    await patchDOM(oldVdom, newVdom, document.body)

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
        <div>
          <span id="d">D</span>
          <span id="b">B</span>
          <span id="a">A</span>
          <span id="c">C</span>
        </div>
      `
    )

    // same nodes, new order
    expect(parentEl.querySelector('#a')).toBe(a0)
    expect(parentEl.querySelector('#b')).toBe(b0)
    expect(parentEl.querySelector('#c')).toBe(c0)
    expect(parentEl.querySelector('#d')).toBe(d0)
  })
})

describe('patchChildren row fast path (_textOnly)', () => {
  test('updates only the text child when `_textOnly` is set', async () => {
    const oldVdom = h('div', {}, [h('li', { key: 'x', _textOnly: true }, ['A'])])
    const newVdom = h('div', {}, [h('li', { key: 'x', _textOnly: true }, ['B'])])

    await mountDOM(oldVdom, document.body)
    const li = document.body.querySelector('li')
    const insertSpy = vi.spyOn(li as any, 'insertBefore')
    const removeSpy = vi.spyOn(li as any, 'removeChild')

    await patchDOM(oldVdom, newVdom, document.body)

    expect(document.body.innerHTML).toBe('<div><li>B</li></div>')
    expect(insertSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
  })
})

describe('components inside children arrays', () => {
  const SwapComponent = defineComponent({
    state() {
      return { swap: false }
    },
    render() {
      return hFragment([
        h('span', {}, ['B']),
        (this as any).state.swap ? h('p', {}, ['XX']) : h('span', {}, ['C']),
      ])
    },
  })

  const MoveComponent = defineComponent({
    state() {
      return { move: false }
    },
    render() {
      if ((this as any).state.move) {
        return hFragment([h('p', {}, ['C']), h('span', {}, ['B'])])
      }

      return hFragment([h('span', {}, ['B']), h('p', {}, ['C'])])
    },
  })

  test('swapping an item (remove + add) inside a component that goes after an element in the same parent node', async () => {
    const vdom = h('div', {}, [h('span', {}, ['A']), h(SwapComponent)])
    await mountDOM(vdom, document.body)

    const component = (vdom as any).children[1].component
    await component.updateState({ swap: true })

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <div>
        <span>A</span>
        <span>B</span>
        <p>XX</p>
      </div>
      `
    )
  })

  test('moving an item inside a component that goes after an element in the same parent node', async () => {
    const vdom = h('div', {}, [h('span', {}, ['A']), h(MoveComponent)])
    await mountDOM(vdom, document.body)

    const component = (vdom as any).children[1].component
    await component.updateState({ move: true })

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <div>
        <span>A</span>
        <p>C</p>
        <span>B</span>
      </div>
      `
    )
  })

  test('swapping an item (remove + add) inside a component that goes after an element in a fragment', async () => {
    const vdom = hFragment([h('span', {}, ['A']), h(SwapComponent)])
    await mountDOM(vdom, document.body)

    const component = (vdom as any).children[1].component
    await component.updateState({ swap: true })

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span>A</span>
      <span>B</span>
      <p>XX</p>
      `
    )
  })

  test('moving an item inside a component that goes after an element in a fragment', async () => {
    const vdom = hFragment([h('span', {}, ['A']), h(MoveComponent)])
    await mountDOM(vdom, document.body)

    const component = (vdom as any).children[1].component
    await component.updateState({ move: true })

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span>A</span>
      <p>C</p>
      <span>B</span>
      `
    )
  })
})

test('patch component where the top-level element changes between renders', async () => {
  const Component = defineComponent({
    render() {
      if ((this as any).props.show) {
        return h('div', {}, ['A'])
      }

      return h('span', {}, ['B'])
    },
  })

  const oldVdom = h(Component, { show: true })
  const newVdom = h(Component, { show: false })
  await mountDOM(oldVdom, document.body)

  expect(document.body.innerHTML).toBe('<div>A</div>')
  expect(oldVdom.el).toBeInstanceOf(HTMLDivElement)

  await patchDOM(oldVdom, newVdom, document.body)

  expect(document.body.innerHTML).toBe('<span>B</span>')
  expect(newVdom.el).toBeInstanceOf(HTMLSpanElement)
})

test('patch two keyed components with top level fragments', async () => {
  const Component = defineComponent({
    render() {
      return hFragment([h('span', {}, ['A']), h('span', {}, ['B'])])
    },
  })

  const oldVdom = hFragment([h(Component, { key: 'a' }), h(Component, { key: 'b' })])
  const newVdom = hFragment([h(Component, { key: 'b' }), h(Component, { key: 'a' })])

  await patch(oldVdom, newVdom)

  expect(document.body.innerHTML).toBe(
    singleHtmlLine`
      <span>A</span><span>B</span>
      <span>A</span><span>B</span>
    `
  )
})

async function patch(oldVdom: any, newVdom: any, hostComponent: any = null) {
  await mountDOM(oldVdom, document.body)
  return patchDOM(oldVdom, newVdom, document.body, hostComponent)
}
