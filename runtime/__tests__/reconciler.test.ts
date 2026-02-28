import { describe, expect, it } from 'vitest'
import { reconcileChildren, type ReconcileNode } from '../reconciler'

function keyedText(key: string, text: string): ReconcileNode {
	return {
		key,
		create() {
			const el = document.createElement('span')
			el.textContent = text
			return el
		},
		patch(node) {
			;(node as HTMLElement).textContent = text
		},
	}
}

function unkeyedText(text: string): ReconcileNode {
	return {
		create() {
			const el = document.createElement('span')
			el.textContent = text
			return el
		},
		patch(node) {
			;(node as HTMLElement).textContent = text
		},
	}
}

describe('runtime/reconciler', () => {
	it('keyed: moves DOM nodes instead of recreating them', () => {
		const host = document.createElement('div')
		host.appendChild(document.createElement('span'))
		host.appendChild(document.createElement('span'))
		host.appendChild(document.createElement('span'))

		// Seed initial children via reconcile so keys are attached.
		reconcileChildren(host, [keyedText('a', 'A'), keyedText('b', 'B'), keyedText('c', 'C')], { keyed: true })

		const a0 = host.childNodes[0]!
		const b0 = host.childNodes[1]!
		const c0 = host.childNodes[2]!

		reconcileChildren(host, [keyedText('c', 'C'), keyedText('a', 'A'), keyedText('b', 'B')], { keyed: true })

		expect(host.childNodes.length).toBe(3)
		expect(host.childNodes[0]).toBe(c0)
		expect(host.childNodes[1]).toBe(a0)
		expect(host.childNodes[2]).toBe(b0)
	})

	it('keyed: removes nodes that are no longer present', () => {
		const host = document.createElement('div')
		reconcileChildren(host, [keyedText('a', 'A'), keyedText('b', 'B'), keyedText('c', 'C')], { keyed: true })

		const a0 = host.childNodes[0]!
		const c0 = host.childNodes[2]!

		reconcileChildren(host, [keyedText('a', 'A'), keyedText('c', 'C')], { keyed: true })
		expect(host.childNodes.length).toBe(2)
		expect(host.childNodes[0]).toBe(a0)
		expect(host.childNodes[1]).toBe(c0)
	})

	it('keyed: inserts new nodes at the right position', () => {
		const host = document.createElement('div')
		reconcileChildren(host, [keyedText('a', 'A'), keyedText('c', 'C')], { keyed: true })

		const a0 = host.childNodes[0]!
		const c0 = host.childNodes[1]!

		reconcileChildren(host, [keyedText('a', 'A'), keyedText('b', 'B'), keyedText('c', 'C')], { keyed: true })

		expect(host.childNodes.length).toBe(3)
		expect(host.childNodes[0]).toBe(a0)
		expect((host.childNodes[1] as HTMLElement).textContent).toBe('B')
		expect(host.childNodes[2]).toBe(c0)
	})

	it('unkeyed: patches in order and truncates/appends', () => {
		const host = document.createElement('div')
		reconcileChildren(host, [unkeyedText('A'), unkeyedText('B')], { keyed: false })
		expect(host.textContent).toBe('AB')

		reconcileChildren(host, [unkeyedText('A1')], { keyed: false })
		expect(host.childNodes.length).toBe(1)
		expect(host.textContent).toBe('A1')

		reconcileChildren(host, [unkeyedText('X'), unkeyedText('Y'), unkeyedText('Z')], { keyed: false })
		expect(host.childNodes.length).toBe(3)
		expect(host.textContent).toBe('XYZ')
	})
})
