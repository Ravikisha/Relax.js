import { describe, expect, it } from 'vitest'
import { defineBlock, mountBlock } from '../block'

function host() {
	const el = document.createElement('div')
	document.body.appendChild(el)
	return el
}

describe('runtime/block input controls', () => {
	it('text input: value prop updates and can be cleared', () => {
		const h = host()
		const def = defineBlock({
			templateHTML: `<div><input id="i" type="text" /></div>`,
			slots: {
				value: { kind: 'prop', path: [0], name: 'value' },
			},
		})

		const mounted = mountBlock(def, h, { value: 'a' })
		const root = mounted.root as HTMLElement
		const input = root.querySelector('#i') as HTMLInputElement

		expect(input.value).toBe('a')

		mounted.update({ value: 'abc' })
		expect(input.value).toBe('abc')

		mounted.update({ value: '' })
		expect(input.value).toBe('')

		mounted.destroy()
	})

	it('checkbox: checked prop toggles true/false', () => {
		const h = host()
		const def = defineBlock({
			templateHTML: `<div><input id="c" type="checkbox" /></div>`,
			slots: {
				checked: { kind: 'prop', path: [0], name: 'checked' },
			},
		})

		const mounted = mountBlock(def, h, { checked: true })
		const root = mounted.root as HTMLElement
		const input = root.querySelector('#c') as HTMLInputElement

		expect(input.checked).toBe(true)
		mounted.update({ checked: false })
		expect(input.checked).toBe(false)
		mounted.update({ checked: true })
		expect(input.checked).toBe(true)

		mounted.destroy()
	})

	it('radio: checked prop toggles, and changing one does not implicitly change others (jsdom)', () => {
		const h = host()
		const def = defineBlock({
			templateHTML: `<div><input id="r1" type="radio" name="g" /><input id="r2" type="radio" name="g" /></div>`,
			slots: {
				r1: { kind: 'prop', path: [0], name: 'checked' },
				r2: { kind: 'prop', path: [1], name: 'checked' },
			},
		})

		const mounted = mountBlock(def, h, { r1: true, r2: false })
		const root = mounted.root as HTMLElement
		const r1 = root.querySelector('#r1') as HTMLInputElement
		const r2 = root.querySelector('#r2') as HTMLInputElement

		expect(r1.checked).toBe(true)
		expect(r2.checked).toBe(false)

		mounted.update({ r1: false, r2: true })
		expect(r1.checked).toBe(false)
		expect(r2.checked).toBe(true)

		mounted.destroy()
	})

	it('number input: value accepts numeric strings and clears to empty string', () => {
		const h = host()
		const def = defineBlock({
			templateHTML: `<div><input id="n" type="number" /></div>`,
			slots: {
				value: { kind: 'prop', path: [0], name: 'value' },
			},
		})

		const mounted = mountBlock(def, h, { value: '1' })
		const root = mounted.root as HTMLElement
		const input = root.querySelector('#n') as HTMLInputElement

		expect(input.value).toBe('1')
		mounted.update({ value: '42' })
		expect(input.value).toBe('42')
		mounted.update({ value: '' })
		expect(input.value).toBe('')

		mounted.destroy()
	})
})
