import { h, hFragment } from '../../src/h'
import { defineComponent } from '../../src/component'
import { createApp } from '../../src/app'

type Widget = { id: number; value: number }

function makeWidgets(n: number): Widget[] {
	const out: Widget[] = new Array(n)
	for (let i = 0; i < n; i++) out[i] = { id: i + 1, value: 0 }
	return out
}

export function mountDashboard200VDOM(host: HTMLElement, count = 200) {
	let api: { update1pct(): void } | null = null

	const App = defineComponent({
		state() {
			return { widgets: makeWidgets(count) }
		},
		render() {
			return h('div', { class: 'grid' }, [
				hFragment(
					(((this as any).state.widgets ?? []) as Widget[]).map((w) =>
						h('div', { class: 'widget', key: w.id }, [`#${w.id} `, String(w.value)])
					)
				),
			])
		},
		update1pct() {
			const widgets = ((((this as any).state.widgets ?? []) as Widget[]).slice())
			const step = Math.max(1, Math.floor(widgets.length / 100))
			for (let i = 0; i < widgets.length; i += step) {
				widgets[i] = { ...widgets[i]!, value: widgets[i]!.value + 1 }
			}
			;(this as any).updateState({ widgets })
		},
		onMounted() {
			api = { update1pct: () => (this as any).update1pct() }
		},
	})

	const app = createApp(App)
	app.mount(host)

	let timer: number | null = null
	let tick = 0

	function update1pct() {
		api?.update1pct()
		tick++
	}

	function start(ms = 250) {
		if (timer != null) return
		timer = window.setInterval(update1pct, ms)
	}

	function stop() {
		if (timer == null) return
		clearInterval(timer)
		timer = null
	}

	return {
		host,
		start,
		stop,
		update1pct,
		get tick() {
			return tick
		},
		dispose() {
			stop()
			app.unmount()
		},
	}
}
