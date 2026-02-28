import { describe, expect, it } from 'vitest'

import { reconcileChildren, type ReconcileItem, type ReconcileNode, type ReconcileRange } from '../reconciler'
import { createPRNG } from './prng'

type Spec =
	| { kind: 'node'; key: string; text: string }
	| { kind: 'range'; key: string; a: string; b: string }

function specToItems(specs: Spec[]): ReconcileItem[] {
	return specs.map((s) => {
		if (s.kind === 'node') {
			const key = s.key
			const text = s.text
			const item: ReconcileNode = {
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
			return item
		}

		const key = s.key
		const a = s.a
		const b = s.b
		const item: ReconcileRange = {
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
		return item
	})
}

function renderReference(host: Element, specs: Spec[]) {
	// Reference strategy:
	// - rebuild the list each step based on keys
	// - reuse existing DOM nodes by key (ranges reuse their 2 nodes)
	const oldByKey = new Map<string, Node[]>()
	const children = Array.from(host.childNodes)
	for (let i = 0; i < children.length; ) {
		const start = children[i] as any
		const key = (start?.__hrbrKey ?? null) as string | null
		const len = typeof start?.__hrbrRangeLen === 'number' ? start.__hrbrRangeLen : 1
		if (key != null) oldByKey.set(key, children.slice(i, i + len))
		i += len
	}

	// Clear host
	while (host.firstChild) host.removeChild(host.firstChild)

	for (const s of specs) {
		const reused = oldByKey.get(s.key) ?? null
		if (s.kind === 'node') {
			let node: Node
			if (reused && reused.length === 1) node = reused[0]!
			else {
				const el = document.createElement('span')
				;(el as any).__hrbrKey = s.key
				;(el as any).__hrbrRangeLen = 1
				node = el
			}
			;(node as HTMLElement).textContent = s.text
			host.appendChild(node)
			continue
		}

		// range
		let aNode: Node
		let bNode: Node
		if (reused && reused.length === 2) {
			;[aNode, bNode] = reused as [Node, Node]
		} else {
			const aEl = document.createElement('span')
			const bEl = document.createElement('span')
			;(aEl as any).__hrbrKey = s.key
			;(aEl as any).__hrbrRangeLen = 2
			aNode = aEl
			bNode = bEl
		}
		;(aNode as HTMLElement).textContent = s.a
		;(bNode as HTMLElement).textContent = s.b
		host.appendChild(aNode)
		host.appendChild(bNode)
	}
}

function readLogical(host: Element): Array<{ key: string; len: number; texts: string[] }> {
	const out: Array<{ key: string; len: number; texts: string[] }> = []
	const nodes = Array.from(host.childNodes)
	for (let i = 0; i < nodes.length; ) {
		const start = nodes[i] as any
		const key = (start?.__hrbrKey ?? null) as string | null
		const len = typeof start?.__hrbrRangeLen === 'number' ? start.__hrbrRangeLen : 1
		if (key == null) {
			// In keyed tests, every logical item should start with a keyed node.
			out.push({ key: '<<unkeyed>>', len: 1, texts: [(nodes[i] as any)?.textContent ?? ''] })
			i += 1
			continue
		}
		const slice = nodes.slice(i, i + len)
		out.push({ key, len, texts: slice.map((n) => (n as any)?.textContent ?? '') })
		i += len
	}
	return out
}

function genNextSpecs(rng: ReturnType<typeof createPRNG>, prevKeys: string[], step: number): Spec[] {
	const pool = new Set(prevKeys)

	// add a few new keys sometimes
	const add = rng.int(3)
	for (let i = 0; i < add; i++) pool.add(`k${step}_${i}_${rng.int(1000)}`)

	let keys = Array.from(pool)

	// shuffle
	for (let i = keys.length - 1; i > 0; i--) {
		const j = rng.int(i + 1)
		;[keys[i], keys[j]] = [keys[j]!, keys[i]!]
	}

	// truncate
	keys = keys.slice(0, rng.int(keys.length + 1))

	return keys.map((k) => {
		const isRange = rng.bool()
		if (isRange) return { kind: 'range', key: k, a: `A:${k}`, b: `B:${k}` }
		return { kind: 'node', key: k, text: `T:${k}` }
	})
}

describe('runtime/reconciler property/fuzz', () => {
	it('keyed ranges: matches a reference DOM builder by textContent across many updates (seeded)', () => {
		const seed = 20260228
		const rng = createPRNG(seed)

		const host = document.createElement('div')
		const ref = document.createElement('div')

		let prevKeys: string[] = []

		for (let step = 0; step < 250; step++) {
			const next = genNextSpecs(rng, prevKeys, step)
			prevKeys = next.map((s) => s.key)

			reconcileChildren(host, specToItems(next), { keyed: true })
			renderReference(ref, next)

			// Primary correctness check: same logical item expansion and per-node text.
			const expectedNodes = next.reduce((acc, s) => acc + (s.kind === 'range' ? 2 : 1), 0)
			if (host.childNodes.length !== expectedNodes) {
				const domDump = Array.from(host.childNodes).map((n) => {
					const anyN: any = n
					return {
						text: anyN?.textContent ?? '',
						key: anyN?.__hrbrKey ?? null,
						len: anyN?.__hrbrRangeLen ?? null,
					}
				})
				throw new Error(
					[
						`seed=${seed} step=${step} (node count mismatch)`,
						`next=${JSON.stringify(next)}`,
						`expectedNodes=${expectedNodes} actualNodes=${host.childNodes.length}`,
						`hostLogical=${JSON.stringify(readLogical(host))}`,
						`hostDom=${JSON.stringify(domDump)}`,
					].join('\n')
				)
			}

			try {
				expect(readLogical(host)).toEqual(readLogical(ref))
			} catch (e) {
				throw new Error(
					[
						`seed=${seed} step=${step}`,
						`next=${JSON.stringify(next)}`,
						`hostLogical=${JSON.stringify(readLogical(host))}`,
						`refLogical=${JSON.stringify(readLogical(ref))}`,
					].join('\n')
				)
			}
		}
	})
})
