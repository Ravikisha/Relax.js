import { batch, createEffect } from './signals'
import { createScheduler, type Lane } from './scheduler'
import { reconcileChildren, type ReconcileNode } from './reconciler'

export type FallbackRenderResult = {
	/** Direct children specs to reconcile into the host */
	children: ReconcileNode[]
	/** When true, force unkeyed reconciliation for this render */
	keyed?: boolean
}

export type MountFallbackOptions = {
	lane?: Lane
	scheduler?: ReturnType<typeof createScheduler>
	/** If omitted, keyed mode is chosen automatically from keys present in `children` */
	keyed?: boolean
}

export type MountedFallback = {
	host: Element
	update(): void
	destroy(): void
	dispose(): void
}

/**
 * Structural fallback mount for dynamic JSX structures (loops/conditionals/etc).
 *
 * Contract:
 * - `render()` may read signals.
 * - On reactivity changes, we schedule a reconcile pass in the requested lane.
 * - `render()` returns an array of child specs; each spec patches/creates a DOM node.
 */
export function mountFallback(host: Element, render: () => FallbackRenderResult, options: MountFallbackOptions = {}): MountedFallback {
	const lane = options.lane ?? 'default'
	const scheduler = options.scheduler ?? createScheduler()

	let disposed = false
	let pending = false

	function runOnce() {
		if (disposed) return
		const res = render()
		const keyed = options.keyed ?? res.keyed
		reconcileChildren(host, res.children, keyed == null ? {} : { keyed })
	}

	function schedule() {
		if (disposed || pending) return
		pending = true
		scheduler.schedule(lane, () => {
			pending = false
			batch(() => runOnce())
		})
	}

	const eff = createEffect(() => {
		// Tracking pass: any signal reads in render() will subscribe this effect.
		render()
		schedule()
	})

	// Initial paint
	runOnce()

	return {
		host,
		update: () => runOnce(),
		destroy: () => {
			while (host.firstChild) host.removeChild(host.firstChild)
		},
		dispose: () => {
			disposed = true
			eff.dispose()
		},
	}
}
