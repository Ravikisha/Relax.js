import { expect, test } from 'vitest'
import { h, hFragment, hSlot } from '../h'
import { fillSlots } from '../slots'

test('remove the slot if no content or default content', () => {
  const vdom = h('div', {}, [hSlot()])
  fillSlots(vdom, [])

  expect(vdom).toEqual(h('div', {}, []))
})

test('set default content if no external content', () => {
  const defaultContent = [h('span', {}, ['Hello'])]
  const vdom = h('div', {}, [hSlot(defaultContent)])

  fillSlots(vdom, [])

  expect(vdom.children).toMatchObject([
    {
      type: 'fragment',
      children: defaultContent,
    },
  ])
})

test('set the external content if provided', () => {
  const content = h('span', {}, ['World'])
  const defaultContent = [h('span', {}, ['Hello'])]
  const vdom = h('div', {}, [hSlot(defaultContent)])

  fillSlots(vdom, [content])

  expect(vdom.children).toMatchObject([
    {
      type: 'fragment',
      children: [content],
    },
  ])
})

test('ignores slots whose parent is a component (they are handled by the component)', () => {
  const Comp = function () {}
  const content = h('span', {}, ['World'])
  const vdom = h('div', {}, [h(Comp as any, {}, [content])])

  fillSlots(vdom, [])

  expect(vdom.children).toEqual([h(Comp as any, {}, [content])])
})
