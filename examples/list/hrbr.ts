import { createSignal } from '../../runtime/signals'
import { mountFallback } from '../../runtime/fallback'
import type { ReconcileNode } from '../../runtime/reconciler'
import { createEffect } from '../../runtime/signals'

type Row = { id: number; label: string }

function rowNode(row: Row): ReconcileNode {
	return {
		key: row.id,
		create() {
			const li = document.createElement('li')
			li.dataset.id = String(row.id)
			li.textContent = row.label
			return li
		},
		patch(node) {
			const li = node as HTMLLIElement
			// Keep patch minimal: only touch text when needed.
			if (li.textContent !== row.label) li.textContent = row.label
		},
	}
}

function makeRows(n: number): Row[] {
	const out: Row[] = new Array(n)
	for (let i = 0; i < n; i++) out[i] = { id: i + 1, label: `Row ${i + 1}` }
	return out
}

/**
 * Example: 10k rows, update 1% of labels per tick.
 *
 * Returns a small controller API for demos/tests.
 */
export function mountList10k1pctHRBR(host: HTMLElement, size = 10_000) {
	const [rows, setRows] = createSignal<Row[]>(makeRows(size))

	const ul = document.createElement('ul')
	host.appendChild(ul)

	const mounted = mountFallback(ul, () => {
		const next = rows().map(rowNode)
		return { children: next }
	})

	function update1pct() {
		setRows((prev) => {
			const next = prev.slice()
			const step = Math.max(1, Math.floor(next.length / 100))
			for (let i = 0; i < next.length; i += step) {
				const r = next[i]!
				next[i] = { ...r, label: r.label + ' *' }
			}
			return next
		})
	}

	return {
		host,
		ul,
		update1pct,
		dispose() {
			mounted.dispose()
			mounted.destroy()
			ul.remove()
		},
	}
}

/**
 * Fine-grained HRBR list:
 * - Create N rows once (DOM stays mounted)
 * - Each row has its own signal
 * - Each tick updates 1% of row signals (no list reconciliation)
 */
export function mountList10k1pctHRBRFine(host: HTMLElement, size = 10_000) {
	const ul = document.createElement('ul')
	host.appendChild(ul)

	const rows: Array<{
		id: number
		label: () => string
		setLabel: (next: string | ((prev: string) => string)) => void
		li: HTMLLIElement
		effect: { dispose(): void }
	}> = []

	for (let i = 0; i < size; i++) {
		const id = i + 1
		const [label, setLabel] = createSignal(`Row ${id}`)
		const li = document.createElement('li')
		li.dataset.id = String(id)
		ul.appendChild(li)
		const effect = createEffect(() => {
			li.textContent = label()
		})
		rows.push({ id, label, setLabel, li, effect })
	}

	function update1pct() {
		const k = Math.max(1, Math.floor(size / 100))
		for (let i = 0; i < k; i++) {
			const idx = (Math.random() * size) | 0
			const row = rows[idx]!
			row.setLabel((prev) => prev + ' *')
		}
	}

	return {
		host,
		ul,
		update1pct,
		dispose() {
			for (const r of rows) r.effect.dispose()
			ul.remove()
		},
	}
}
