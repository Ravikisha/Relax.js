import { defineBlock, mountCompiledBlock } from '../../runtime/block'
import { createSignal } from '../../runtime/signals'

type WidgetState = {
	id: number
	value: () => number
	setValue: (n: number | ((p: number) => number)) => void
}

function makeWidgets(n: number): WidgetState[] {
	const out: WidgetState[] = []
	for (let i = 0; i < n; i++) {
		const [v, setV] = createSignal(0)
		out.push({ id: i + 1, value: v, setValue: setV })
	}
	return out
}

const WidgetBlock = defineBlock({
	// NOTE: slot paths walk childNodes, so each <span> must contain a real Text node.
	templateHTML: `<div class="widget"><span class="label"> </span><span class="value"> </span></div>`,
	slots: {
		label: { kind: 'text', path: [0, 0] },
		value: { kind: 'text', path: [1, 0] },
	},
})

export function mountDashboard200HRBR(host: HTMLElement, count = 200) {
	const widgets = makeWidgets(count)
	const roots: HTMLElement[] = []
	const mounted: Array<ReturnType<typeof mountCompiledBlock>> = []

	const grid = document.createElement('div')
	grid.className = 'grid'
	host.appendChild(grid)

	for (const w of widgets) {
		const cell = document.createElement('div')
		cell.className = 'cell'
		grid.appendChild(cell)

		const m = mountCompiledBlock(
			WidgetBlock,
			cell,
			[
				{ key: 'label', read: () => `#${w.id}` },
				{ key: 'value', read: () => String(w.value()) },
			],
			{ lane: 'transition' }
		)
		mounted.push(m)
		roots.push(m.root as HTMLElement)
	}

	let timer: number | null = null
	let tick = 0

	function update1pct() {
		// update ~1% widgets each tick
		const step = Math.max(1, Math.floor(widgets.length / 100))
		for (let i = 0; i < widgets.length; i += step) {
			widgets[i]!.setValue((p) => p + 1)
		}
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
		grid,
		roots,
		widgets,
		start,
		stop,
		update1pct,
		get tick() {
			return tick
		},
		dispose() {
			stop()
			for (const m of mounted) (m as any).dispose?.()
			grid.remove()
		},
	}
}
