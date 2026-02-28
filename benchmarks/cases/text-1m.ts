import type { BenchmarkCase } from '../harness'
import { defineBlock, mountCompiledBlock } from '../../runtime/block'
import { createSignal } from '../../runtime/signals'

export function text1mHRBR(): BenchmarkCase {
	return {
		name: 'text-1m:hrbr',
		setup(host) {
			// A single text slot.
			const block = defineBlock({
				// NOTE: slot paths walk childNodes, so we need a real Text node in the template.
				templateHTML: `<div><span> </span></div>`,
				// Path is from root element. For <div><span>TEXT</span></div>:
				// 0 => <span>, 0 => Text node within <span>
				slots: { t: { kind: 'text', path: [0, 0] } },
			})

			const [count, setCount] = createSignal(0)
			const mounted = mountCompiledBlock(block, host, [{ key: 't', read: () => String(count()) }])

			let i = 0
			const total = 1_000_000

			return {
				tick() {
					// Do a chunk each frame so we still measure frame drops.
					const chunk = 10_000
					for (let j = 0; j < chunk && i < total; j++, i++) setCount(i)
				},
				teardown() {
					mounted.dispose()
				},
			}
		},
	}
}
