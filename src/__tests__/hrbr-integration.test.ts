import { beforeEach, describe, expect, test, vi } from 'vitest'

import { defineComponent } from '../component'
import { h, hBlock } from '../h'
import { mountDOM } from '../mount-dom'
import { patchDOM } from '../patch-dom'
import { destroyDOM } from '../destroy-dom'
import { defineBlock, mountBlock } from '../../runtime/block'

beforeEach(() => {
	document.body.innerHTML = ''
})

describe('VDOM ↔ HRBR integration (experimental)', () => {
	test('can mount an HRBR block returned from a VDOM component', () => {
		const mount = vi.fn((host: Element) => {
			const el = document.createElement('div')
			el.textContent = 'HRBR'
			host.appendChild(el)
			return {
				destroy() {
					// remove everything inside host (simulate block destroy)
					host.innerHTML = ''
				},
			}
		})

		const Comp = defineComponent({
			render() {
				return hBlock(mount)
			},
		})

		const vdom = h(Comp)
		mountDOM(vdom as any, document.body)

		expect(document.body.textContent).toBe('HRBR')
		expect(mount).toHaveBeenCalledTimes(1)

		destroyDOM(vdom as any)
		expect(document.body.textContent).toBe('')
	})

	test('HRBR event slots match Relax VDOM semantics (handler bound to host component)', () => {
		const calls: Array<{ thisArg: unknown; arg: unknown }> = []
		function handler(this: unknown, arg: unknown) {
			calls.push({ thisArg: this, arg })
		}

		const block = defineBlock({
			templateHTML: `<button>ok</button>`,
			slots: {
				onClick: { kind: 'event', path: [], name: 'click' },
			},
		})

		const Comp = defineComponent({
			render() {
				return hBlock((host: Element) => {
					const mounted = mountBlock(block, host, { onClick: handler }, { hostComponent: this })
					return mounted
				})
			},
		})

		const vdom = h(Comp)
		mountDOM(vdom as any, document.body)

		const btn = document.body.querySelector('button') as HTMLButtonElement
		btn.click()

		expect(calls).toHaveLength(1)
		expect(calls[0]!.thisArg).toBe((vdom as any).component)
		expect(calls[0]!.arg).toBeInstanceOf(Event)

		destroyDOM(vdom as any)
	})

	test('patch preserves HRBR instance when mount factory identity is stable', async () => {
		const hostInstances: Array<unknown> = []
		const mount = vi.fn((host: Element) => {
			const marker = document.createElement('div')
			marker.textContent = `hello`
			host.appendChild(marker)
			const instance = { destroy: vi.fn(() => (host.innerHTML = '')) }
			hostInstances.push(instance)
			return instance
		})

		const Comp = defineComponent({
			render() {
				// return a stable mount function
				return hBlock(mount)
			},
		})

		let vdom: any = h(Comp)
		mountDOM(vdom, document.body)
		expect(mount).toHaveBeenCalledTimes(1)
		expect(document.body.textContent).toBe('hello')

		const next: any = h(Comp)
		patchDOM(vdom, next, document.body)
		vdom = next

		// no remount
		expect(mount).toHaveBeenCalledTimes(1)
		expect(hostInstances).toHaveLength(1)
		expect(document.body.textContent).toBe('hello')

		destroyDOM(vdom)
		expect((hostInstances[0] as any).destroy).toHaveBeenCalledTimes(1)
	})

	test('patch remounts HRBR instance when mount factory identity changes', async () => {
		const mkMount = (label: string) =>
			vi.fn((host: Element) => {
				const el = document.createElement('div')
				el.textContent = label
				host.appendChild(el)
				return {
					dispose: vi.fn(),
					destroy: vi.fn(() => (host.innerHTML = '')),
				}
			})

		const MountA = mkMount('A')
		const MountB = mkMount('B')
		let currentMount = MountA

		const Comp = defineComponent({
			render() {
				return hBlock(currentMount)
			},
		})

		let vdom: any = h(Comp)
		mountDOM(vdom, document.body)
		expect(document.body.textContent).toBe('A')
		expect(MountA).toHaveBeenCalledTimes(1)

		// swap to a different mount function
		currentMount = MountB
		// Trigger a component patch so it re-renders and returns the new mount.
		vdom.component.updateState({ __tick: 1 })
		// `updateState()` already patched the subtree; `vdom` now points at the new HRBR vnode.

		expect(MountA).toHaveBeenCalledTimes(1)
		expect(MountB).toHaveBeenCalledTimes(1)
		expect(document.body.textContent).toBe('B')

		destroyDOM(vdom)
	})
})
