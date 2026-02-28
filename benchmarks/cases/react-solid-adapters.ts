import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createSignal, createRoot as createSolidRoot } from 'solid-js'
import { render as solidRender } from 'solid-js/web'
import { createRng } from '../rng'

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
export function waitForHostMutation(host: HTMLElement, timeoutMs = 50): Promise<void> {
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

export function reactList10k1pct(host: HTMLElement, n: number, seed = 12345): ExternalBenchCommitController {
	const ids = Array.from({ length: n }, (_, i) => i)
	const values = new Array<number>(n).fill(0)
	const rng = createRng(seed)

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
				const idx = rng.int(n)
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

export function solidList10k1pct(host: HTMLElement, n: number, seed = 12345): ExternalBenchCommitController {
	// Fine-grained Solid: stable DOM nodes; update only changed rows.
	const values = new Array<number>(n).fill(0)
	const [vals, setVals] = createSignal(values)
	const rng = createRng(seed)

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
					const idx = rng.int(n)
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

export function reactWidgets200(host: HTMLElement, n: number, seed = 12345): ExternalBenchCommitController {
	const ids = Array.from({ length: n }, (_, i) => i)
	const values = new Array<number>(n).fill(0)
	const rng = createRng(seed)

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
				const idx = rng.int(n)
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

export function solidWidgets200(host: HTMLElement, n: number, seed = 12345): ExternalBenchCommitController {
	const values = new Array<number>(n).fill(0)
	const [vals, setVals] = createSignal(values)
	const rng = createRng(seed)

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
					const idx = rng.int(n)
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
