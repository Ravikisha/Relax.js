import { describe, expect, it, vi } from 'vitest'
import { defineBlock, mountBlock, mountCompiledBlock } from '../block'
import { createSignal } from '../signals'

function host() {
	const el = document.createElement('div')
	document.body.appendChild(el)
	return el
}

describe('runtime/block disposal correctness', () => {
	it('destroy removes event listeners (no further handler calls)', () => {
		const h = host()
		const def = defineBlock({
			templateHTML: `<button id="b"></button>`,
			slots: {
				onClick: { kind: 'event', path: [], name: 'click' },
			},
		})

		const fn = vi.fn()
		const mounted = mountBlock(def, h, { onClick: fn })
		const btn = (mounted.root as HTMLElement) as HTMLButtonElement

		btn.click()
		expect(fn).toHaveBeenCalledTimes(1)

		mounted.destroy()
		// Clicking a detached element *should not* invoke the handler.
		btn.click()
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('destroy is idempotent even with event slots and children', () => {
		const h = host()
		const def = defineBlock({
			templateHTML: `<div><button id="b"></button></div>`,
			slots: {
				onClick: { kind: 'event', path: [0], name: 'click' },
			},
		})

		const mounted = mountBlock(def, h, { onClick: () => {} })
		mounted.destroy()
		mounted.destroy()
		expect(h.textContent).toBe('')
	})

	it('mountCompiledBlock.dispose stops reactive updates and removes DOM', async () => {
		const h = host()
		const [count, setCount] = createSignal(0)

		const def = defineBlock({
			templateHTML: `<div><span id="t"> </span></div>`,
			slots: {
				text: { kind: 'text', path: [0, 0] },
			},
		})

		const mounted = mountCompiledBlock(def, h, [{ key: 'text', read: () => String(count()) }])
		expect(h.textContent).toContain('0')

		mounted.dispose()

		setCount(1)
		await new Promise((r) => setTimeout(r, 0))
		// The whole block should be gone, and no updates should resurrect it.
		expect(h.textContent).toBe('')
	})
})
