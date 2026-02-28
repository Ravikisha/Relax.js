import { describe, expect, it } from 'vitest'
import { createSignal } from '../signals'
import { mountFallback } from '../fallback'
import type { ReconcileNode } from '../reconciler'

function textNode(key: string, text: string): ReconcileNode {
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

describe('runtime/fallback (phase 6 integration)', () => {
	it('reconciles structural changes when signal-driven list changes', async () => {
		const host = document.createElement('div')
		const [items, setItems] = createSignal(['a', 'b', 'c'])

		const mounted = mountFallback(host, () => {
			const kids = items().map((k) => textNode(k, k.toUpperCase()))
			return { children: kids }
		})

		expect(host.textContent).toBe('ABC')
		const a0 = host.childNodes[0]!
		const b0 = host.childNodes[1]!
		const c0 = host.childNodes[2]!

		// reorder + insert
		setItems(['c', 'a', 'b', 'd'])
		await new Promise((r) => setTimeout(r, 0))

		expect(host.textContent).toBe('CABD')
		expect(host.childNodes[0]).toBe(c0)
		expect(host.childNodes[1]).toBe(a0)
		expect(host.childNodes[2]).toBe(b0)
		expect((host.childNodes[3] as HTMLElement).textContent).toBe('D')

		// remove
		setItems(['b', 'd'])
		await new Promise((r) => setTimeout(r, 0))
		expect(host.textContent).toBe('BD')
		expect(host.childNodes.length).toBe(2)
		expect(host.childNodes[0]).toBe(b0)

		mounted.dispose()
	})
})
