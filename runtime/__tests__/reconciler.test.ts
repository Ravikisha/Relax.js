import { describe, expect, it } from 'vitest'
import { reconcileChildren, type ReconcileNode, type ReconcileRange } from '../reconciler'

type Spec =
	| { kind: 'node'; key: string; text: string }
	| { kind: 'range'; key: string; a: string; b: string }

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

function keyedRange(key: string, a: string, b: string): ReconcileRange {
	return {
		kind: 'range',
		key,
		create() {
			const aEl = document.createElement('span')
			aEl.textContent = a
			const bEl = document.createElement('span')
			bEl.textContent = b
			return [aEl, bEl]
		},
		patch(nodes) {
			;(nodes[0] as HTMLElement).textContent = a
			;(nodes[1] as HTMLElement).textContent = b
		},
	}
}

function renderSpec(s: Spec): ReconcileNode | ReconcileRange {
	if (s.kind === 'node') return keyedText(s.key, s.text)
	return keyedRange(s.key, s.a, s.b)
}

function hostKeys(host: Element): Array<string | null> {
	return Array.from(host.childNodes).map((n) => ((n as any).__hrbrKey ?? null) as any)
}

function lcg(seed: number) {
	let s = seed >>> 0
	return () => {
		s = (Math.imul(1664525, s) + 1013904223) >>> 0
		return s
	}
}

function reconcileReference(prev: Spec[], next: Spec[]) {
	// A simple reference reconciler that keeps node identity by key where possible;
	// it doesn't try to minimize moves, it just builds the next list.
	const prevByKey = new Map<string, Spec>()
	for (const p of prev) prevByKey.set(p.key, p)
	const out: Spec[] = []
	for (const n of next) {
		const p = prevByKey.get(n.key)
		out.push(p ? { ...n } : { ...n })
	}
	return out
}

describe('runtime/reconciler', () => {
	it('dev diagnostics: warns on mixed keyed/unkeyed children in keyed mode', () => {
		const warn = console.warn
		const warns: string[] = []
		console.warn = (m: any) => {
			warns.push(String(m))
		}
		try {
			const host = document.createElement('div')
			reconcileChildren(host, [keyedText('a', 'A'), unkeyedText('X')], { keyed: true, dev: true })
			expect(warns.some((m) => m.includes('mixed keyed and unkeyed'))).toBe(true)
		} finally {
			console.warn = warn
		}
	})

	it('dev diagnostics: warns when next keys have no overlap with previous keys', () => {
		const warn = console.warn
		const warns: string[] = []
		console.warn = (m: any) => {
			warns.push(String(m))
		}
		try {
			const host = document.createElement('div')
			reconcileChildren(host, [keyedText('a', 'A'), keyedText('b', 'B')], { keyed: true })
			reconcileChildren(host, [keyedText('x', 'X'), keyedText('y', 'Y')], { keyed: true, dev: true })
			expect(warns.some((m) => m.includes('no overlap'))).toBe(true)
		} finally {
			console.warn = warn
		}
	})

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

	it('keyed: supports range items (logical item => multiple DOM nodes)', () => {
		const host = document.createElement('div')
		reconcileChildren(host, [keyedRange('a', 'A1', 'A2'), keyedText('b', 'B')], { keyed: true })

		expect(host.textContent).toBe('A1A2B')
		expect(host.childNodes.length).toBe(3)

		const a10 = host.childNodes[0]!
		const a20 = host.childNodes[1]!
		const b0 = host.childNodes[2]!

		// Move range after 'b'
		reconcileChildren(host, [keyedText('b', 'B'), keyedRange('a', 'A1', 'A2')], { keyed: true })
		expect(host.textContent).toBe('BA1A2')
		expect(host.childNodes.length).toBe(3)
		expect(host.childNodes[0]).toBe(b0)
		expect(host.childNodes[1]).toBe(a10)
		expect(host.childNodes[2]).toBe(a20)

		// Insert a node between b and the range
		reconcileChildren(host, [keyedText('b', 'B'), keyedText('c', 'C'), keyedRange('a', 'A1', 'A2')], { keyed: true })
		expect(host.textContent).toBe('BCA1A2')
		expect(host.childNodes.length).toBe(4)
		expect(host.childNodes[0]).toBe(b0)
		expect((host.childNodes[1] as HTMLElement).textContent).toBe('C')
		expect(host.childNodes[2]).toBe(a10)
		expect(host.childNodes[3]).toBe(a20)

		// Remove the range
		reconcileChildren(host, [keyedText('b', 'B'), keyedText('c', 'C')], { keyed: true })
		expect(host.textContent).toBe('BC')
		expect(host.childNodes.length).toBe(2)
		expect(host.childNodes[0]).toBe(b0)
	})

	it('keyed: range reorders keep range node identity (middle move + swap)', () => {
		const host = document.createElement('div')
		reconcileChildren(host, [keyedText('x', 'X'), keyedRange('a', 'A1', 'A2'), keyedText('y', 'Y'), keyedRange('b', 'B1', 'B2')], {
			keyed: true,
		})

		const x0 = host.childNodes[0]!
		const a10 = host.childNodes[1]!
		const a20 = host.childNodes[2]!
		const y0 = host.childNodes[3]!
		const b10 = host.childNodes[4]!
		const b20 = host.childNodes[5]!

		// Swap the two ranges and also move 'y' to the end
		reconcileChildren(host, [keyedText('x', 'X'), keyedRange('b', 'B1', 'B2'), keyedRange('a', 'A1', 'A2'), keyedText('y', 'Y')], { keyed: true })

		expect(host.childNodes.length).toBe(6)
		expect(host.childNodes[0]).toBe(x0)
		expect(host.childNodes[1]).toBe(b10)
		expect(host.childNodes[2]).toBe(b20)
		expect(host.childNodes[3]).toBe(a10)
		expect(host.childNodes[4]).toBe(a20)
		expect(host.childNodes[5]).toBe(y0)
	})

	// NOTE: A full reference-based fuzz harness for keyed ranges is desirable, but it needs a more
	// robust oracle (and likely a stricter contract around how range start nodes are tagged).
	// We'll add that once the reconciler's keyed-range metadata invariants are finalized.
})
