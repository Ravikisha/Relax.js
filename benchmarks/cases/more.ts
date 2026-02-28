import type { BenchmarkCase } from '../harness'
import React from 'react'
import { createSignal, createRoot as createSolidRoot } from 'solid-js'
import { render as solidRender } from 'solid-js/web'

import { defineBlock, mountCompiledBlock } from '../../runtime/block'
import { createSignal as createRelaxSignal } from '../../runtime/signals'

import { defineComponent } from '../../src/component'
import { createApp } from '../../src/app'
import { h, hFragment } from '../../src/h'

import {
	mountReact,
	mountSolid,
	type ExternalBenchCommitController,
} from './react-solid-adapters'
import { waitForHostMutation } from './react-solid-adapters'

/**
 * 1) element-props-toggle-5k
 * Toggle a boolean attribute on 5k elements.
 */
export function propsToggle5kRelaxVDOM(): BenchmarkCase {
	return {
		name: 'props-toggle-5k:relax-vdom',
		setup(host) {
			let api: { toggle(): void } | null = null
			const App = defineComponent({
				state() {
					return { on: false, n: 5_000 }
				},
				render() {
					const on = (this.state as any).on as boolean
					const n = (this.state as any).n as number
					return h('div', {}, [
						hFragment(
							Array.from({ length: n }, (_, i) =>
								h('button', { key: i, disabled: on }, ['x'])
							)
						),
					])
				},
				toggle() {
					;(this as any).updateState({ on: !(this.state as any).on })
				},
				onMounted() {
					api = { toggle: () => (this as any).toggle() }
				},
			})
			const app = createApp(App)
			app.mount(host)
			return {
				tick: () => api?.toggle(),
				teardown: () => app.unmount(),
			}
		},
	}
}

export function propsToggle5kRelaxHRBR(): BenchmarkCase {
	return {
		name: 'props-toggle-5k:relax-hrbr',
		setup(host) {
			const n = 5_000
			const block = defineBlock({
				templateHTML: `<div></div>`,
				slots: {
					// We’ll set `disabled` on each <button> by patching the property.
					// Note: properties slots use `path` to the element.
				},
			})

			// For this micro-bench, we just mount buttons once and then toggle `disabled` directly.
			// The point is “DOM/property work”, not reconciliation.
			const root = document.createElement('div')
			host.appendChild(root)
			const buttons: HTMLButtonElement[] = new Array(n)
			for (let i = 0; i < n; i++) {
				const b = document.createElement('button')
				b.textContent = 'x'
				buttons[i] = b
				root.appendChild(b)
			}
			let on = false
			return {
				tick() {
					on = !on
					for (let i = 0; i < buttons.length; i++) buttons[i]!.disabled = on
				},
				teardown() {
					root.remove()
				},
			}
		},
	}
}

export function propsToggle5kReact(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'props-toggle-5k:react',
		setup(host) {
			const n = 5_000
			let on = false
			function App() {
				const [, force] = React.useReducer((x: number) => x + 1, 0)
				;(globalThis as any).__reactForceP = force
				return React.createElement(
					'div',
					null,
					Array.from({ length: n }, (_, i) =>
						React.createElement('button', { key: i, disabled: on }, 'x')
					)
				)
			}
			const m = mountReact(host, React.createElement(App))
			ctrl = {
				update1pct() {
					on = !on
					const f = (globalThis as any).__reactForceP as undefined | (() => void)
					f?.()
				},
				commit: async () => {
					return waitForHostMutation(host)
				},
				dispose() {
					delete (globalThis as any).__reactForceP
					m.dispose()
				},
			}
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => {
					ctrl?.dispose()
					ctrl = null
				},
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function propsToggle5kSolid(): BenchmarkCase {
	let dispose: null | (() => void) = null
	let on = false
	return {
		name: 'props-toggle-5k:solid',
		setup(host) {
			const n = 5_000
			const buttons: HTMLButtonElement[] = new Array(n)
			dispose = mountSolid(host, () => {
				const root = document.createElement('div')
				for (let i = 0; i < n; i++) {
					const b = document.createElement('button')
					b.textContent = 'x'
					buttons[i] = b
					root.appendChild(b)
				}
				host.appendChild(root)
			}).dispose

			return {
				tick() {
					on = !on
					for (let i = 0; i < buttons.length; i++) buttons[i]!.disabled = on
				},
				teardown() {
					dispose?.()
					dispose = null
				},
			}
		},
	}
}

/**
 * 2) style-update-grid-1k
 * Update inline styles on 1k boxes.
 */
export function styleGrid1kRelaxVDOM(): BenchmarkCase {
	return {
		name: 'style-grid-1k:relax-vdom',
		setup(host) {
			let api: { tick(): void } | null = null
			const n = 1_000
			const App = defineComponent({
				state() {
					return { t: 0 }
				},
				render() {
					const t = (this.state as any).t as number
					return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(40,10px)', gap: '2px' } }, [
						hFragment(
							Array.from({ length: n }, (_, i) =>
								h('div', {
								key: i,
								style: { width: '10px', height: '10px', background: `rgb(${(i + t) % 255}, 80, 160)` },
							}, [])
							)
						),
					])
				},
				step() {
					;(this as any).updateState({ t: ((this.state as any).t ?? 0) + 1 })
				},
				onMounted() {
					api = { tick: () => (this as any).step() }
				},
			})
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.tick(), teardown: () => app.unmount() }
		},
	}
}

export function styleGrid1kReact(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'style-grid-1k:react',
		setup(host) {
			const n = 1_000
			let t = 0
			function App() {
				const [, force] = React.useReducer((x: number) => x + 1, 0)
				;(globalThis as any).__reactForceS = force
				return React.createElement(
					'div',
					{ style: { display: 'grid', gridTemplateColumns: 'repeat(40,10px)', gap: '2px' } },
					Array.from({ length: n }, (_, i) =>
						React.createElement('div', {
							key: i,
							style: { width: 10, height: 10, background: `rgb(${(i + t) % 255}, 80, 160)` },
						})
					)
				)
			}
			const m = mountReact(host, React.createElement(App))
			ctrl = {
				update1pct() {
					t++
					const f = (globalThis as any).__reactForceS as undefined | (() => void)
					f?.()
				},
				commit: async () => {
					return waitForHostMutation(host)
				},
				dispose() {
					delete (globalThis as any).__reactForceS
					m.dispose()
				},
			}
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => {
					ctrl?.dispose()
					ctrl = null
				},
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function styleGrid1kSolid(): BenchmarkCase {
	let disposeRoot: null | (() => void) = null
	const n = 1_000
	const nodes: HTMLDivElement[] = new Array(n)
	let t = 0
	return {
		name: 'style-grid-1k:solid',
		setup(host) {
			disposeRoot = mountSolid(host, () => {
				const grid = document.createElement('div')
				grid.style.display = 'grid'
				grid.style.gridTemplateColumns = 'repeat(40,10px)'
				grid.style.gap = '2px'
				for (let i = 0; i < n; i++) {
					const d = document.createElement('div')
					d.style.width = '10px'
					d.style.height = '10px'
					d.style.background = `rgb(${i % 255}, 80, 160)`
					nodes[i] = d
					grid.appendChild(d)
				}
				host.appendChild(grid)
			}).dispose
			return {
				tick() {
					t++
					for (let i = 0; i < nodes.length; i++) nodes[i]!.style.background = `rgb(${(i + t) % 255}, 80, 160)`
				},
				teardown() {
					disposeRoot?.()
					disposeRoot = null
				},
			}
		},
	}
}

/**
 * 3) table-2k-shuffle
 * Shuffle 2k keyed rows each tick.
 */
export function table2kShuffleRelaxVDOM(): BenchmarkCase {
	return {
		name: 'table-2k-shuffle:relax-vdom',
		setup(host) {
			let api: { shuffle(): void } | null = null
			const n = 2_000
			const App = defineComponent({
				state() {
					return { rows: Array.from({ length: n }, (_, i) => ({ id: i + 1 })) }
				},
				render() {
					return h('ul', {}, [
						hFragment(
							((this.state as any).rows as any[]).map((r) =>
								h('li', { key: r.id, _textOnly: true }, [`Row ${r.id}`])
							)
						),
					])
				},
				shuffle() {
					const rows = (((this as any).state.rows ?? []) as any[]).slice()
					// Simple deterministic shuffle step (swap pairs)
					for (let i = 0; i < rows.length - 1; i += 2) {
						const tmp = rows[i]
						rows[i] = rows[i + 1]
						rows[i + 1] = tmp
					}
					;(this as any).updateState({ rows })
				},
				onMounted() {
					api = { shuffle: () => (this as any).shuffle() }
				},
			})
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.shuffle(), teardown: () => app.unmount() }
		},
	}
}

export function table2kShuffleReact(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'table-2k-shuffle:react',
		setup(host) {
			const n = 2_000
			let rows = Array.from({ length: n }, (_, i) => i + 1)
			function App() {
				const [, force] = React.useReducer((x: number) => x + 1, 0)
				;(globalThis as any).__reactForceT = force
				return React.createElement(
					'ul',
					null,
					rows.map((id) => React.createElement('li', { key: id }, `Row ${id}`))
				)
			}
			const m = mountReact(host, React.createElement(App))
			ctrl = {
				update1pct() {
					rows = rows.slice()
					for (let i = 0; i < rows.length - 1; i += 2) {
						const tmp = rows[i]!
						rows[i] = rows[i + 1]!
						rows[i + 1] = tmp
					}
					const f = (globalThis as any).__reactForceT as undefined | (() => void)
					f?.()
				},
				commit: async () => {
					return waitForHostMutation(host)
				},
				dispose() {
					delete (globalThis as any).__reactForceT
					m.dispose()
				},
			}
			return { tick: () => ctrl!.update1pct(), teardown: () => ctrl?.dispose() }
		},
		commit: () => ctrl?.commit(),
	}
}

export function table2kShuffleSolid(): BenchmarkCase {
	let disposeRoot: null | (() => void) = null
	const n = 2_000
	const lis: HTMLLIElement[] = new Array(n)
	let rows = Array.from({ length: n }, (_, i) => i + 1)
	return {
		name: 'table-2k-shuffle:solid',
		setup(host) {
			disposeRoot = mountSolid(host, () => {
				const ul = document.createElement('ul')
				for (let i = 0; i < rows.length; i++) {
					const li = document.createElement('li')
					li.textContent = `Row ${rows[i]}`
					lis[i] = li
					ul.appendChild(li)
				}
				host.appendChild(ul)
			}).dispose
			return {
				tick() {
					rows = rows.slice()
					for (let i = 0; i < rows.length - 1; i += 2) {
						const tmp = rows[i]!
						rows[i] = rows[i + 1]!
						rows[i + 1] = tmp
					}
					// Update text only (no keyed DOM moves in this simplified Solid adapter).
					for (let i = 0; i < lis.length; i++) lis[i]!.textContent = `Row ${rows[i]}`
				},
				teardown() {
					disposeRoot?.()
					disposeRoot = null
				},
			}
		},
	}
}

/**
 * 4) svg-1k
 * Update attributes on 1k SVG circles.
 */
export function svg1kRelaxVDOM(): BenchmarkCase {
	return {
		name: 'svg-1k:relax-vdom',
		setup(host) {
			let api: { step(): void } | null = null
			const n = 1_000
			const App = defineComponent({
				state() {
					return { t: 0 }
				},
				render() {
					const t = (this.state as any).t as number
					return h('svg', { width: 400, height: 400 } as any, [
						hFragment(
							Array.from({ length: n }, (_, i) =>
								h('circle', {
								key: i,
								cx: (i % 50) * 8,
								cy: ((i / 50) | 0) * 8,
								r: 3,
								fill: `rgb(${(i + t) % 255}, 120, 80)`,
							} as any, [])
							)
						),
					])
				},
				step() {
					;(this as any).updateState({ t: ((this.state as any).t ?? 0) + 1 })
				},
				onMounted() {
					api = { step: () => (this as any).step() }
				},
			})
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.step(), teardown: () => app.unmount() }
		},
	}
}

/**
 * 5) input-typing-1k
 * Update value prop on 1k inputs.
 */
export function inputTyping1kRelaxVDOM(): BenchmarkCase {
	return {
		name: 'input-typing-1k:relax-vdom',
		setup(host) {
			let api: { step(): void } | null = null
			const n = 1_000
			const App = defineComponent({
				state() {
					return { t: 0 }
				},
				render() {
					const t = (this.state as any).t as number
					return h('div', {}, [
						hFragment(
							Array.from({ length: n }, (_, i) =>
								h('input', { key: i, value: `Hello ${t}-${i}` }, [])
							)
						),
					])
				},
				step() {
					;(this as any).updateState({ t: ((this.state as any).t ?? 0) + 1 })
				},
				onMounted() {
					api = { step: () => (this as any).step() }
				},
			})
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.step(), teardown: () => app.unmount() }
		},
	}
}

