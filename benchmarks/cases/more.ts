import type { BenchmarkCase } from '../harness'
import { h, hFragment } from '../../src/h'
import { defineComponent } from '../../src/component'
import { createApp } from '../../src/app'
import { mountFallback, reconcileChildren, type ReconcileNode } from '../../runtime'
import { hydrateBlock, defineBlock } from '../../runtime'
import {
	mountReact,
	mountSolid,
	type ExternalBenchCommitController,
} from './react-solid-adapters'

import {
	reactAttrsToggle1k,
	reactClassStyle1k,
	reactEventsSwap1k,
	reactInputType100,
	reactKeyedRotate5k,
	solidAttrsToggle1k,
	solidClassStyle1k,
	solidEventsSwap1k,
	solidInputType100,
	solidKeyedRotate5k,
} from './react-solid-adapters'

function nextFrame(): Promise<void> {
	if (typeof requestAnimationFrame !== 'undefined') {
		return new Promise((r) => requestAnimationFrame(() => r()))
	}
	return new Promise((r) => setTimeout(() => r(), 16))
}

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
		obs.observe(host, { childList: true, subtree: true, characterData: true, attributes: true })
		setTimeout(() => {
			if (done) return
			done = true
			obs.disconnect()
			void nextFrame().then(resolve)
		}, timeoutMs)
	})
}

type MountCtrl = { tick(): void | Promise<void>; dispose(): void; commit?: () => void | Promise<void> }

// ---------------------------
// 1) Mount/unmount: 1k rows
// ---------------------------

export function mountUnmount1kRelaxVDOM(): BenchmarkCase {
	return {
		name: 'mount-unmount-1k:relax-vdom',
		setup(host) {
			const n = 1000
			let mounted = false
			let app: any = null
			const App = defineComponent({
				render() {
					return h('ul', {}, [
						hFragment(
							Array.from({ length: n }, (_, i) => h('li', { key: i }, [`Row ${i}`]))
						),
					])
				},
			})

			return {
				tick() {
					if (!mounted) {
						app = createApp(App)
						app.mount(host)
						mounted = true
					} else {
						app.unmount()
						app = null
						mounted = false
					}
				},
				teardown() {
					if (app) app.unmount()
					host.innerHTML = ''
				},
			}
		},
	}
}

function mountUnmount1kReact(host: HTMLElement): ExternalBenchCommitController {
	const n = 1000
	let mounted = false
	let m: { dispose(): void } | null = null

	function App() {
		return (globalThis as any).React.createElement(
			'ul',
			null,
			Array.from({ length: n }, (_, i) =>
				(globalThis as any).React.createElement('li', { key: i }, `Row ${i}`)
			)
		)
	}

	return {
		update1pct() {
			if (!mounted) {
				m = mountReact(host, (globalThis as any).React.createElement(App))
				mounted = true
			} else {
				m?.dispose()
				m = null
				mounted = false
			}
		},
		commit() {
			return waitForHostMutation(host)
		},
		dispose() {
			m?.dispose()
			m = null
			mounted = false
		},
	}
}

function mountUnmount1kSolid(host: HTMLElement): ExternalBenchCommitController {
	const n = 1000
	let mounted = false
	let dispose: (() => void) | null = null

	return {
		update1pct() {
			if (!mounted) {
				dispose = mountSolid(host, () => {
					const ul = document.createElement('ul')
					for (let i = 0; i < n; i++) {
						const li = document.createElement('li')
						li.textContent = `Row ${i}`
						ul.appendChild(li)
					}
					host.appendChild(ul)
				}).dispose
				mounted = true
			} else {
				dispose?.()
				dispose = null
				host.innerHTML = ''
				mounted = false
			}
		},
		commit() {
			return Promise.resolve()
		},
		dispose() {
			dispose?.()
			dispose = null
			host.innerHTML = ''
		},
	}
}

export function mountUnmount1kReactCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'mount-unmount-1k:react',
		setup(host) {
			ctrl = mountUnmount1kReact(host)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function mountUnmount1kSolidCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'mount-unmount-1k:solid',
		setup(host) {
			ctrl = mountUnmount1kSolid(host)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

// ---------------------------
// 2) Keyed reorder: rotate 5k
// ---------------------------

export function keyedRotate5kRelaxVDOM(): BenchmarkCase {
	let api: { rotate(): void } | null = null
	const n = 5000
	const App = defineComponent({
		state() {
			return { rows: Array.from({ length: n }, (_, i) => ({ id: i, label: `Row ${i}` })) }
		},
		render() {
			return h('ul', { _reconcile: 'hrbr' }, [
				hFragment(
					(this.state as any).rows.map((r: any) => h('li', { key: r.id, _textOnly: true }, [r.label]))
				),
			])
		},
		rotate() {
			const rows = (this.state as any).rows as any[]
			const next = rows.slice(1)
			next.push(rows[0])
			this.updateState({ rows: next })
		},
		onMounted() {
			api = { rotate: () => (this as any).rotate() }
		},
	})

	return {
		name: 'keyed-rotate-5k:relax-vdom',
		setup(host) {
			const app = createApp(App)
			app.mount(host)
			return {
				tick: () => api?.rotate(),
				teardown: () => app.unmount(),
			}
		},
	}
}

export function keyedRotate5kReactCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'keyed-rotate-5k:react',
		setup(host) {
			ctrl = reactKeyedRotate5k(host, 5000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function keyedRotate5kSolidCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'keyed-rotate-5k:solid',
		setup(host) {
			ctrl = solidKeyedRotate5k(host, 5000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

// ---------------------------
// 3) Attribute churn: toggle 5 attrs on 1k nodes
// ---------------------------

export function attrsToggle1kRelaxVDOM(): BenchmarkCase {
	let api: { toggle(): void } | null = null
	const n = 1000
	const App = defineComponent({
		state() {
			return { on: false }
		},
		render() {
			const on = (this.state as any).on
			return h('div', {}, [
				hFragment(
					Array.from({ length: n }, (_, i) =>
						h(
							'div',
							{
								key: i,
								['data-a']: on ? '1' : null,
								['data-b']: on ? '2' : null,
								title: on ? `t${i}` : null,
								role: on ? 'button' : null,
								['aria-label']: on ? `row-${i}` : null,
							},
							[`Row ${i}`]
						)
					)
				),
			])
		},
		toggle() {
			this.updateState({ on: !(this.state as any).on })
		},
		onMounted() {
			api = { toggle: () => (this as any).toggle() }
		},
	})

	return {
		name: 'attrs-toggle-1k:relax-vdom',
		setup(host) {
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.toggle(), teardown: () => app.unmount() }
		},
	}
}

export function attrsToggle1kReactCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'attrs-toggle-1k:react',
		setup(host) {
			ctrl = reactAttrsToggle1k(host, 1000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function attrsToggle1kSolidCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'attrs-toggle-1k:solid',
		setup(host) {
			ctrl = solidAttrsToggle1k(host, 1000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

// ---------------------------
// 4) Class/style churn: 1k nodes
// ---------------------------

export function classStyle1kRelaxVDOM(): BenchmarkCase {
	let api: { flip(): void } | null = null
	const n = 1000
	const App = defineComponent({
		state() {
			return { t: 0 }
		},
		render() {
			const t = (this.state as any).t
			const even = (t & 1) === 0
			return h('div', {}, [
				hFragment(
					Array.from({ length: n }, (_, i) =>
						h(
							'div',
							{
								key: i,
								class: even ? ['a', i % 2 ? 'x' : 'y'] : ['b', i % 3 ? 'm' : 'n'],
								style: even ? { color: 'red', padding: '2px' } : { color: 'blue', padding: '3px' },
							},
							[`Row ${i}`]
						)
					)
				),
			])
		},
		flip() {
			this.updateState({ t: (this.state as any).t + 1 })
		},
		onMounted() {
			api = { flip: () => (this as any).flip() }
		},
	})
	return {
		name: 'class-style-1k:relax-vdom',
		setup(host) {
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.flip(), teardown: () => app.unmount() }
		},
	}
}

export function classStyle1kReactCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'class-style-1k:react',
		setup(host) {
			ctrl = reactClassStyle1k(host, 1000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function classStyle1kSolidCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'class-style-1k:solid',
		setup(host) {
			ctrl = solidClassStyle1k(host, 1000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

// ---------------------------
// 5) Event rebind: swap handler refs on 1k buttons
// ---------------------------

export function eventsSwap1kRelaxVDOM(): BenchmarkCase {
	let api: { swap(): void } | null = null
	const n = 1000
	const App = defineComponent({
		state() {
			return { on: false }
		},
		render() {
			const on = (this.state as any).on
			const handlerA = () => {}
			const handlerB = () => {}
			return h('div', {}, [
				hFragment(
					Array.from({ length: n }, (_, i) =>
						h(
							'button',
							{
								key: i,
								on: { click: on ? handlerA : handlerB },
							},
							[`Btn ${i}`]
						)
					)
				),
			])
		},
		swap() {
			this.updateState({ on: !(this.state as any).on })
		},
		onMounted() {
			api = { swap: () => (this as any).swap() }
		},
	})

	return {
		name: 'events-swap-1k:relax-vdom',
		setup(host) {
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.swap(), teardown: () => app.unmount() }
		},
	}
}

export function eventsSwap1kReactCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'events-swap-1k:react',
		setup(host) {
			ctrl = reactEventsSwap1k(host, 1000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function eventsSwap1kSolidCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'events-swap-1k:solid',
		setup(host) {
			ctrl = solidEventsSwap1k(host, 1000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

// ---------------------------
// 6) Fragment-heavy tree: toggle branches
// ---------------------------

export function fragmentToggleRelaxVDOM(): BenchmarkCase {
	let api: { flip(): void } | null = null
	const App = defineComponent({
		state() {
			return { on: false }
		},
		render() {
			const on = (this.state as any).on
			return hFragment([
				h('div', { key: 'a' }, [on ? 'A1' : 'A0']),
				hFragment([
					h('span', { key: 'b' }, [on ? 'B1' : 'B0']),
					h('span', { key: 'c' }, [on ? 'C1' : 'C0']),
					hFragment([h('i', { key: 'd' }, [on ? 'D1' : 'D0'])]),
				]),
			])
		},
		flip() {
			this.updateState({ on: !(this.state as any).on })
		},
		onMounted() {
			api = { flip: () => (this as any).flip() }
		},
	})

	return {
		name: 'fragments-toggle:relax-vdom',
		setup(host) {
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.flip(), teardown: () => app.unmount() }
		},
	}
}

// ---------------------------
// 7) HRBR reconcile-only: 10k keyed reorder specs
// ---------------------------

export function hrbrReconcile10k(): BenchmarkCase {
	return {
		name: 'hrbr-reconcile-10k:relax-hrbr',
		setup(host) {
			const n = 10_000
			let order = Array.from({ length: n }, (_, i) => i)
			const nodes = new Map<number, Text>()

			function specFor(id: number): ReconcileNode {
				return {
					key: id,
					create() {
						const t = document.createTextNode(String(id))
						nodes.set(id, t)
						return t
					},
					patch(node) {
						void node
					},
				}
			}

			// initial
			reconcileChildren(host, order.map(specFor), { keyed: true })

			return {
				tick() {
					// rotate by 1
					order = order.slice(1)
					order.push(order[0]!)
					reconcileChildren(host, order.map(specFor), { keyed: true })
				},
				teardown() {
					host.innerHTML = ''
				},
			}
		},
	}
}

// ---------------------------
// 8) SSR hydration: hydrate + update 100 text slots
// ---------------------------

export function ssrHydrate100Slots(): BenchmarkCase {
	return {
		name: 'ssr-hydrate-100-slots:relax-hrbr',
		setup(host) {
			const def = defineBlock({
				templateHTML: `<div>${Array.from({ length: 100 }, (_, i) => `<span>__${i}__</span>`).join('')}</div>`,
				slots: Object.fromEntries(
					Array.from({ length: 100 }, (_, i) => [
						`s${i}`,
						{ kind: 'text', path: [i, 0] },
					])
				) as any,
			})

			// server HTML
			host.innerHTML = def.templateHTML
			const hydrated = hydrateBlock(def as any, host, {})
			let t = 0
			return {
				tick() {
					t++
					const patch: Record<string, unknown> = {}
					for (let i = 0; i < 100; i++) patch[`s${i}`] = `v${t}-${i}`
					hydrated.update(patch)
				},
				teardown() {
					hydrated.destroy()
					host.innerHTML = ''
				},
			}
		},
	}
}

// ---------------------------
// 9) Input typing: set value 100 chars
// ---------------------------

export function inputType100RelaxVDOM(): BenchmarkCase {
	let api: { type(): void } | null = null
	const App = defineComponent({
		state() {
			return { v: '' }
		},
		render() {
			return h('input', { value: (this.state as any).v }, [])
		},
		type() {
			const base = (this.state as any).v as string
			this.updateState({ v: (base + 'x').slice(0, 100) })
		},
		onMounted() {
			api = { type: () => (this as any).type() }
		},
	})

	return {
		name: 'input-type-100:relax-vdom',
		setup(host) {
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.type(), teardown: () => app.unmount() }
		},
	}
}

export function inputType100ReactCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'input-type-100:react',
		setup(host) {
			ctrl = reactInputType100(host)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function inputType100SolidCase(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'input-type-100:solid',
		setup(host) {
			ctrl = solidInputType100(host)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => ctrl?.dispose(),
			}
		},
		commit: () => ctrl?.commit(),
	}
}

// ---------------------------
// 10) Mixed: list 2k update 10% + reorder chunk
// ---------------------------

export function mixed2kRelaxVDOM(): BenchmarkCase {
	let api: { step(): void } | null = null
	const n = 2000
	const App = defineComponent({
		state() {
			return { rows: Array.from({ length: n }, (_, i) => ({ id: i, v: 0 })) }
		},
		render() {
			return h('ul', { _reconcile: 'hrbr' }, [
				hFragment(
					(this.state as any).rows.map((r: any) => h('li', { key: r.id, _textOnly: true }, [`${r.id}:${r.v}`]))
				),
			])
		},
		step() {
			const rows = (this.state as any).rows as any[]
			const next = rows.slice()
			for (let i = 0; i < next.length; i += 10) {
				next[i] = { ...next[i], v: next[i].v + 1 }
			}
			// also rotate last 50 items to the front
			const tail = next.splice(next.length - 50, 50)
			this.updateState({ rows: tail.concat(next) })
		},
		onMounted() {
			api = { step: () => (this as any).step() }
		},
	})
	return {
		name: 'mixed-2k:relax-vdom',
		setup(host) {
			const app = createApp(App)
			app.mount(host)
			return { tick: () => api?.step(), teardown: () => app.unmount() }
		},
	}
}
