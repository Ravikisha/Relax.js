import { h, hFragment } from '../../src/h'
import { defineComponent } from '../../src/component'
import { createApp } from '../../src/app'

type Row = { id: number; label: string }

function makeRows(n: number): Row[] {
	const out: Row[] = new Array(n)
	for (let i = 0; i < n; i++) out[i] = { id: i + 1, label: `Row ${i + 1}` }
	return out
}

export function mountList10k1pctVDOM(host: HTMLElement, size = 10_000, opts: { useApp?: boolean } = {}) {
	let api: { update1pct(): void } | null = null
	let directCmp: any | null = null
	const useApp = opts.useApp ?? true

	const App = defineComponent({
		state() {
			return { rows: makeRows(size) }
		},
		render() {
			return h('ul', {}, [
				hFragment(
					this.state.rows.map((r: Row) =>
						h('li', { key: r.id, _textOnly: true }, [r.label])
					)
				),
			])
		},
		update1pct() {
			const rows = (((this as any).state?.rows ?? []) as Row[])
			const next = rows.slice()
			const step = Math.max(1, Math.floor(next.length / 100))
			for (let i = 0; i < next.length; i += step) {
				const r = next[i]!
				next[i] = { ...r, label: r.label + ' *' }
			}
			this.updateState({ rows: next })
		},
		onMounted() {
			api = { update1pct: () => (this as any).update1pct() }
		},
	})

	const app = createApp(App)
	if (useApp) {
		app.mount(host)
	} else {
		// Direct mount: avoids app-level scheduling so the benchmark isolates patchDOM hot paths.
		directCmp = new (App as any)({}, {}, null)
		directCmp.mount(host)
		// `mountDOM` only schedules `onMounted` via the microtask job queue.
		// For the benchmark we need the API to be ready before the first tick.
		void directCmp.onMounted()
	}

	return {
		host,
		update1pct() {
			api?.update1pct()
		},
		dispose() {
			if (useApp) app.unmount()
			else directCmp?.unmount()
		},
	}
}

/**
 * VDOM "memo row" baseline:
 * - Still uses the classic VDOM renderer
 * - Wraps each row in a component that won't re-render unless its `label` prop changed
 */
export function mountList10k1pctVDOMMemoRow(host: HTMLElement, size = 10_000) {
	let api: { update1pct(): void } | null = null

	const RowView = defineComponent({
		render() {
			return h('li', {}, [(this.props as any).label])
		},
	})

	const App = defineComponent({
		state() {
			return { rows: makeRows(size) }
		},
		render() {
			return h('ul', {}, [
				hFragment(
					(this.state as any).rows.map((r: Row) =>
						h(RowView, { key: r.id, label: r.label })
					)
				),
			])
		},
		update1pct() {
			const rows = (((this as any).state?.rows ?? []) as Row[])
			const next = rows.slice()
			const step = Math.max(1, Math.floor(next.length / 100))
			for (let i = 0; i < next.length; i += step) {
				const r = next[i]!
				next[i] = { ...r, label: r.label + ' *' }
			}
			this.updateState({ rows: next })
		},
		onMounted() {
			api = { update1pct: () => (this as any).update1pct() }
		},
	})

	const app = createApp(App)
	app.mount(host)

	return {
		host,
		update1pct() {
			api?.update1pct()
		},
		dispose() {
			app.unmount()
		},
	}
}
