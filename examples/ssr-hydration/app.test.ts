import { describe, expect, it } from 'vitest'
import { mountClientHydrated, renderServerHTML } from './app'

describe('examples/ssr-hydration', () => {
	it('hydrates server HTML and keeps root element identity', async () => {
		const host = document.createElement('div')
		host.innerHTML = renderServerHTML('0')
		const root0 = host.firstElementChild
		expect(root0).not.toBeNull()

		mountClientHydrated(host)
		expect(host.firstElementChild).toBe(root0)
	})
})
