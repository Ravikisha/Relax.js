import { expect, test } from 'vitest'
import { traverseDFS } from '../traverse-dom'

const vdom = {
  name: 'a',
  children: [
    {
      name: 'a1',
      children: [
        {
          name: 'a11',
          children: [],
        },
      ],
    },
    {
      name: 'a2',
    },
    {
      name: 'a3',
      children: [
        {
          name: 'a31',
          children: [],
        },
      ],
    },
  ],
}

test('traverses the virtual DOM tree in depth-first order', () => {
  const names: string[] = []
  const parentNames: Array<string | null> = []

  traverseDFS(vdom as any, (node: any, parent: any) => {
    names.push(node.name)
    parentNames.push(parent?.name ?? null)
  })

  expect(names).toEqual(['a', 'a1', 'a11', 'a2', 'a3', 'a31'])
  expect(parentNames).toEqual([null, 'a', 'a1', 'a', 'a', 'a3'])
})

test('can skip entire branches', () => {
  const names: string[] = []

  traverseDFS(
    vdom as any,
    (node: any) => {
      names.push(node.name)
    },
    (node: any) => node.name === 'a3'
  )

  expect(names).toEqual(['a', 'a1', 'a11', 'a2'])
})
