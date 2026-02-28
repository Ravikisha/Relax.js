import { describe, expect, it, beforeEach } from 'vitest'

import {
	getDevtoolsCounters,
	resetDevtoolsCounters,
	setInstrumentationEnabled,
	setDevtoolsHook,
} from '../devtools'
import { defineBlock, mountBlock } from '../block'

describe('runtime/instrumentation (optional)', () => {
	beforeEach(() => {
		setDevtoolsHook(null)
		resetDevtoolsCounters()
		setInstrumentationEnabled(false)
	})

	it('does not count DOM ops unless instrumentation is enabled', () => {
		const def = defineBlock({
			templateHTML: `<div>_</div>`,
			slots: {
				// div -> text
				t: { kind: 'text', path: [0] },
			},
		})

		const host = document.createElement('div')
		const b = mountBlock(def, host, { t: 'a' })
		b.update({ t: 'b' })

		expect(getDevtoolsCounters().domOps).toBe(0)
		b.destroy()
	})

	it('counts DOM ops when instrumentation is enabled', () => {
		setInstrumentationEnabled(true)
		resetDevtoolsCounters()

		const def = defineBlock({
			templateHTML: `<div>_</div>`,
			slots: {
				// div -> text
				t: { kind: 'text', path: [0] },
			},
		})

		const host = document.createElement('div')
		const b = mountBlock(def, host, { t: 'a' })
		b.update({ t: 'b' })

		expect(getDevtoolsCounters().domOps).toBeGreaterThanOrEqual(1)
		b.destroy()
	})
})
