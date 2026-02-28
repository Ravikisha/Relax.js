import { defineBlock, mountBlock, mountCompiledBlock } from '../../runtime/block'
import { hydrateBlock } from '../../runtime/hydration'
import { createSignal } from '../../runtime/signals'

/**
 * A tiny block we can render on the server as HTML and then hydrate on the client.
 */
export const CounterBlock = defineBlock({
	templateHTML: `<div class="counter"><button id="inc">+</button><span></span></div>`,
	slots: {
		value: { kind: 'text', path: [1, 0] },
	},
})

export function renderServerHTML(value: string) {
	const host = document.createElement('div')
	// Server-side render = just mount into a detached DOM and serialize.
	mountBlock(CounterBlock, host, { value })
	return host.innerHTML
}

export function mountClientHydrated(host: HTMLElement) {
	const [count, setCount] = createSignal(0)

	// Hydrate existing HTML if present.
	const hydrated = hydrateBlock(CounterBlock, host, { value: String(count()) })

	// Wire reactive updates (no VDOM). We reuse mountCompiledBlock to drive slot updates.
	const mounted = mountCompiledBlock(CounterBlock, host, [{ key: 'value', read: () => String(count()) }])

	// Bind events manually (compiler ignores events in template mode).
	const btn = (host.querySelector('#inc') as HTMLButtonElement | null)
	btn?.addEventListener('click', () => setCount((c) => c + 1))

	return {
		host,
		hydrated,
		mounted,
		dispose() {
			mounted.dispose()
		},
	}
}
