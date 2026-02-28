import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createSignal, createRoot as createSolidRoot } from 'solid-js'
import { render as solidRender } from 'solid-js/web'

export type ExternalBenchController = {
	update1pct(): void
	dispose(): void
}

export type ExternalBenchCommitController = ExternalBenchController & {
	/** Resolve only once the framework has committed its updates. */
	commit(): void | Promise<void>
}

function nextFrame(): Promise<void> {
	if (typeof requestAnimationFrame !== 'undefined') {
		return new Promise((r) => requestAnimationFrame(() => r()))
	}
	return new Promise((r) => setTimeout(() => r(), 16))
}

/**
 * Resolve when the host receives any DOM mutation (attributes/children/text).
 *
 * This is a practical "commit barrier" for UI libs where the API doesn't expose
 * a reliable commit callback. It avoids forcing a full-frame wait, so avg times
 * won't collapse to ~16.7ms.
 */
function waitForHostMutation(host: HTMLElement, timeoutMs = 50): Promise<void> {
	if (typeof MutationObserver === 'undefined') return nextFrame()

	return new Promise((resolve) => {
		let done = false
		const obs = new MutationObserver(() => {
			if (done) return
			done = true
			obs.disconnect()
			resolve()
		})

		obs.observe(host, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
		})

		setTimeout(() => {
			if (done) return
			done = true
			obs.disconnect()
			// If nothing mutated (or we missed it), fall back to a frame boundary.
			// This keeps the benchmark making progress and avoids hanging.
			void nextFrame().then(resolve)
		}, timeoutMs)
	})
}

export function mountReact(host: HTMLElement, node: React.ReactElement): { dispose(): void } {
	let root: Root | null = createRoot(host)
	root.render(node)
	return {
		dispose() {
			if (!root) return
			root.unmount()
			root = null
		},
	}
}

export function mountSolid(host: HTMLElement, mount: () => void): { dispose(): void } {
	let disposeRoot: null | (() => void) = null
	createSolidRoot((dispose) => {
		disposeRoot = dispose
		mount()
	})
	return { dispose: () => disposeRoot?.() }
}

export function reactList10k1pct(host: HTMLElement, n: number): ExternalBenchCommitController {
	const ids = Array.from({ length: n }, (_, i) => i)
	const values = new Array<number>(n).fill(0)

	function App() {
		// We keep state outside React to make update() cheap and comparable to other cases.
		// React still has to reconcile DOM on each render.
		const [, force] = React.useReducer((x: number) => x + 1, 0)
		;(globalThis as any).__reactForce = force
		return React.createElement(
			'ul',
			null,
			ids.map((id) => React.createElement('li', { key: id }, `Row ${id}: ${values[id]}`))
		)
	}

	const m = mountReact(host, React.createElement(App))

	function forceRender() {
		const f = (globalThis as any).__reactForce as undefined | ((n?: any) => void)
		f?.()
	}

	return {
		update1pct() {
			const k = Math.max(1, Math.floor(n / 100))
			for (let i = 0; i < k; i++) {
				const idx = (Math.random() * n) | 0
				values[idx] = (values[idx] ?? 0) + 1
			}
			forceRender()
		},
		commit() {
			// React commits can be async; wait until the host actually mutates.
			return waitForHostMutation(host)
		},
		dispose() {
			delete (globalThis as any).__reactForce
			m.dispose()
		},
	}
}

export function solidList10k1pct(host: HTMLElement, n: number): ExternalBenchCommitController {
	// Fine-grained Solid: stable DOM nodes; update only changed rows.
	const values = new Array<number>(n).fill(0)
	const [vals, setVals] = createSignal(values)

	const ul = document.createElement('ul')
	const lis: HTMLLIElement[] = new Array(n)
	for (let i = 0; i < n; i++) {
		const li = document.createElement('li')
		li.textContent = `Row ${i}: ${values[i]}`
		lis[i] = li
		ul.appendChild(li)
	}

	const dispose = solidRender(() => ul, host)

	return {
		update1pct() {
			const k = Math.max(1, Math.floor(n / 100))
			setVals((prev) => {
				const next = prev.slice()
				for (let i = 0; i < k; i++) {
					const idx = (Math.random() * n) | 0
					next[idx] = (next[idx] ?? 0) + 1
					lis[idx]!.textContent = `Row ${idx}: ${next[idx]}`
				}
				return next
			})
		},
		commit() {
			// We mutate DOM synchronously inside update1pct(); this just ensures
			// measurement captures the DOM work consistently.
			return Promise.resolve()
		},
		dispose() {
			dispose()
		},
	}
}

export function reactWidgets200(host: HTMLElement, n: number): ExternalBenchCommitController {
	const ids = Array.from({ length: n }, (_, i) => i)
	const values = new Array<number>(n).fill(0)

	function App() {
		const [, force] = React.useReducer((x: number) => x + 1, 0)
		;(globalThis as any).__reactForceW = force
		return React.createElement(
			'div',
			{
				style: {
					display: 'grid',
					gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
					gap: '8px',
				},
			},
			ids.map((id) =>
				React.createElement(
					'div',
					{
						key: id,
						style: {
							border: '1px solid #ddd',
							borderRadius: 6,
							padding: 8,
							fontFamily: 'system-ui',
						},
					},
					React.createElement('div', null, `Widget ${id}`),
					React.createElement('div', null, `Value: ${values[id]}`)
				)
			)
		)
	}

	const m = mountReact(host, React.createElement(App))
	function forceRender() {
		const f = (globalThis as any).__reactForceW as undefined | ((n?: any) => void)
		f?.()
	}

	return {
		update1pct() {
			const k = Math.max(1, Math.floor(n / 100))
			for (let i = 0; i < k; i++) {
				const idx = (Math.random() * n) | 0
				values[idx] = (values[idx] ?? 0) + 1
			}
			forceRender()
		},
		commit() {
			return waitForHostMutation(host)
		},
		dispose() {
			delete (globalThis as any).__reactForceW
			m.dispose()
		},
	}
}

export function solidWidgets200(host: HTMLElement, n: number): ExternalBenchCommitController {
	const values = new Array<number>(n).fill(0)
	const [vals, setVals] = createSignal(values)

	const grid = document.createElement('div')
	grid.style.display = 'grid'
	grid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))'
	grid.style.gap = '8px'

	const valueNodes: HTMLDivElement[] = new Array(n)
	for (let i = 0; i < n; i++) {
		const card = document.createElement('div')
		card.style.border = '1px solid #ddd'
		card.style.borderRadius = '6px'
		card.style.padding = '8px'
		card.style.fontFamily = 'system-ui'
		const a = document.createElement('div')
		a.textContent = `Widget ${i}`
		const b = document.createElement('div')
		b.textContent = `Value: ${values[i]}`
		valueNodes[i] = b
		card.appendChild(a)
		card.appendChild(b)
		grid.appendChild(card)
	}

	const dispose = solidRender(() => grid, host)

	return {
		update1pct() {
			const k = Math.max(1, Math.floor(n / 100))
			setVals((prev) => {
				const next = prev.slice()
				for (let i = 0; i < k; i++) {
					const idx = (Math.random() * n) | 0
					next[idx] = (next[idx] ?? 0) + 1
					valueNodes[idx]!.textContent = `Value: ${next[idx]}`
				}
				return next
			})
		},
		commit() {
			return Promise.resolve()
		},
		dispose() {
			dispose()
		},
	}
}

// ---------------------------
// Extra adapters for vivid cases
// ---------------------------

export function reactKeyedRotate5k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let order = Array.from({ length: n }, (_, i) => i)

	function App() {
		const [, force] = React.useReducer((x: number) => x + 1, 0)
		;(globalThis as any).__reactForceRotate = force
		return React.createElement(
			'ul',
			null,
			order.map((id) => React.createElement('li', { key: id }, `Row ${id}`))
		)
	}

	const m = mountReact(host, React.createElement(App))
	function forceRender() {
		const f = (globalThis as any).__reactForceRotate as undefined | ((n?: any) => void)
		f?.()
	}

	return {
		update1pct() {
			order = order.slice(1)
			order.push(order[0]!)
			forceRender()
		},
		commit() {
			return waitForHostMutation(host)
		},
		dispose() {
			delete (globalThis as any).__reactForceRotate
			m.dispose()
		},
	}
}

export function solidKeyedRotate5k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let order = Array.from({ length: n }, (_, i) => i)
	const ul = document.createElement('ul')
	const liById = new Map<number, HTMLLIElement>()
	for (let i = 0; i < n; i++) {
		const li = document.createElement('li')
		li.textContent = `Row ${i}`
		liById.set(i, li)
		ul.appendChild(li)
	}
	const dispose = solidRender(() => ul, host)

	return {
		update1pct() {
			order = order.slice(1)
			order.push(order[0]!)
			// reorder DOM nodes (keyed move workload)
			const frag = document.createDocumentFragment()
			for (const id of order) frag.appendChild(liById.get(id)!)
			ul.textContent = ''
			ul.appendChild(frag)
		},
		commit() {
			return Promise.resolve()
		},
		dispose() {
			dispose()
		},
	}
}

export function reactAttrsToggle1k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let on = false
	const ids = Array.from({ length: n }, (_, i) => i)

	function App() {
		const [, force] = React.useReducer((x: number) => x + 1, 0)
		;(globalThis as any).__reactForceAttrs = force
		return React.createElement(
			'div',
			null,
			ids.map((i) =>
				React.createElement(
					'div',
					{
						key: i,
						...(on
							? { 'data-a': '1', 'data-b': '2', title: `t${i}`, role: 'button', 'aria-label': `row-${i}` }
							: { 'data-a': null, 'data-b': null, title: null, role: null, 'aria-label': null }),
					},
					`Row ${i}`
				)
			)
		)
	}

	const m = mountReact(host, React.createElement(App))
	function forceRender() {
		const f = (globalThis as any).__reactForceAttrs as undefined | ((n?: any) => void)
		f?.()
	}

	return {
		update1pct() {
			on = !on
			forceRender()
		},
		commit() {
			return waitForHostMutation(host)
		},
		dispose() {
			delete (globalThis as any).__reactForceAttrs
			m.dispose()
		},
	}
}

export function solidAttrsToggle1k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let on = false
	const nodes: HTMLDivElement[] = new Array(n)
	const root = document.createElement('div')
	for (let i = 0; i < n; i++) {
		const d = document.createElement('div')
		d.textContent = `Row ${i}`
		nodes[i] = d
		root.appendChild(d)
	}
	const dispose = solidRender(() => root, host)

	return {
		update1pct() {
			on = !on
			for (let i = 0; i < n; i++) {
				const el = nodes[i]!
				if (on) {
					el.setAttribute('data-a', '1')
					el.setAttribute('data-b', '2')
					el.setAttribute('title', `t${i}`)
					el.setAttribute('role', 'button')
					el.setAttribute('aria-label', `row-${i}`)
				} else {
					el.removeAttribute('data-a')
					el.removeAttribute('data-b')
					el.removeAttribute('title')
					el.removeAttribute('role')
					el.removeAttribute('aria-label')
				}
			}
		},
		commit() {
			return Promise.resolve()
		},
		dispose() {
			dispose()
		},
	}
}

export function reactClassStyle1k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let t = 0
	const ids = Array.from({ length: n }, (_, i) => i)

	function App() {
		const [, force] = React.useReducer((x: number) => x + 1, 0)
		;(globalThis as any).__reactForceCS = force
		const even = (t & 1) === 0
		return React.createElement(
			'div',
			null,
			ids.map((i) =>
				React.createElement(
					'div',
					{
						key: i,
						className: even ? `a ${i % 2 ? 'x' : 'y'}` : `b ${i % 3 ? 'm' : 'n'}`,
						style: even ? { color: 'red', padding: '2px' } : { color: 'blue', padding: '3px' },
					},
					`Row ${i}`
				)
			)
		)
	}

	const m = mountReact(host, React.createElement(App))
	function forceRender() {
		const f = (globalThis as any).__reactForceCS as undefined | ((n?: any) => void)
		f?.()
	}

	return {
		update1pct() {
			t++
			forceRender()
		},
		commit() {
			return waitForHostMutation(host)
		},
		dispose() {
			delete (globalThis as any).__reactForceCS
			m.dispose()
		},
	}
}

export function solidClassStyle1k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let t = 0
	const nodes: HTMLDivElement[] = new Array(n)
	const root = document.createElement('div')
	for (let i = 0; i < n; i++) {
		const d = document.createElement('div')
		d.textContent = `Row ${i}`
		nodes[i] = d
		root.appendChild(d)
	}
	const dispose = solidRender(() => root, host)

	return {
		update1pct() {
			t++
			const even = (t & 1) === 0
			for (let i = 0; i < n; i++) {
				const el = nodes[i]!
				el.className = even ? `a ${i % 2 ? 'x' : 'y'}` : `b ${i % 3 ? 'm' : 'n'}`
				el.style.color = even ? 'red' : 'blue'
				el.style.padding = even ? '2px' : '3px'
			}
		},
		commit() {
			return Promise.resolve()
		},
		dispose() {
			dispose()
		},
	}
}

export function reactEventsSwap1k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let on = false
	const ids = Array.from({ length: n }, (_, i) => i)
	const handlerA = () => {}
	const handlerB = () => {}

	function App() {
		const [, force] = React.useReducer((x: number) => x + 1, 0)
		;(globalThis as any).__reactForceEv = force
		return React.createElement(
			'div',
			null,
			ids.map((i) =>
				React.createElement(
					'button',
					{ key: i, onClick: on ? handlerA : handlerB },
					`Btn ${i}`
				)
			)
		)
	}

	const m = mountReact(host, React.createElement(App))
	function forceRender() {
		const f = (globalThis as any).__reactForceEv as undefined | ((n?: any) => void)
		f?.()
	}

	return {
		update1pct() {
			on = !on
			forceRender()
		},
		commit() {
			return waitForHostMutation(host)
		},
		dispose() {
			delete (globalThis as any).__reactForceEv
			m.dispose()
		},
	}
}

export function solidEventsSwap1k(host: HTMLElement, n: number): ExternalBenchCommitController {
	let on = false
	const root = document.createElement('div')
	const buttons: HTMLButtonElement[] = new Array(n)
	for (let i = 0; i < n; i++) {
		const b = document.createElement('button')
		b.textContent = `Btn ${i}`
		buttons[i] = b
		root.appendChild(b)
	}
	const handlerA = () => {}
	const handlerB = () => {}
	const dispose = solidRender(() => root, host)

	return {
		update1pct() {
			on = !on
			for (let i = 0; i < n; i++) {
				const b = buttons[i]!
				b.onclick = on ? handlerA : handlerB
			}
		},
		commit() {
			return Promise.resolve()
		},
		dispose() {
			dispose()
		},
	}
}

export function reactInputType100(host: HTMLElement): ExternalBenchCommitController {
	let v = ''
	function App() {
		const [, force] = React.useReducer((x: number) => x + 1, 0)
		;(globalThis as any).__reactForceInput = force
		return React.createElement('input', { value: v, onChange: () => {} })
	}
	const m = mountReact(host, React.createElement(App))
	function forceRender() {
		const f = (globalThis as any).__reactForceInput as undefined | ((n?: any) => void)
		f?.()
	}
	return {
		update1pct() {
			v = (v + 'x').slice(0, 100)
			forceRender()
		},
		commit() {
			return waitForHostMutation(host)
		},
		dispose() {
			delete (globalThis as any).__reactForceInput
			m.dispose()
		},
	}
}

export function solidInputType100(host: HTMLElement): ExternalBenchCommitController {
	let v = ''
	const input = document.createElement('input')
	input.value = v
	const dispose = solidRender(() => input, host)
	return {
		update1pct() {
			v = (v + 'x').slice(0, 100)
			input.value = v
		},
		commit() {
			return Promise.resolve()
		},
		dispose() {
			dispose()
		},
	}
}
