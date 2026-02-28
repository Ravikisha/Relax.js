import { describe, expect, it } from 'vitest'
import { defineBlock, mountBlock } from '../block'

function host() {
	const el = document.createElement('div')
	document.body.appendChild(el)
	return el
}

describe('runtime/block slot matrix', () => {
	it('HTML: text + attr + prop + class + style + event behave correctly', () => {
		const h = host()

		const def = defineBlock({
			templateHTML: `<div> <button id="btn"></button><input id="txt" type="text" /><input id="cb" type="checkbox" /></div>`,
			slots: {
				text: { kind: 'text', path: [0] },
				dataX: { kind: 'attr', path: [1], name: 'data-x' },
				hidden: { kind: 'attr', path: [1], name: 'hidden' },
				value: { kind: 'prop', path: [2], name: 'value' },
				checked: { kind: 'prop', path: [3], name: 'checked' },
				className: { kind: 'class', path: [1] },
				style: { kind: 'style', path: [1] },
				onClick: { kind: 'event', path: [1], name: 'click' },
			},
		})

		let clicks = 0
		const onClick = () => {
			clicks++
		}

		const mounted = mountBlock(def, h, {
			text: 'hello',
			dataX: '1',
			hidden: true,
			value: 'abc',
			checked: true,
			className: 'a',
			style: 'color: red;',
			onClick,
		})

		const root = mounted.root as HTMLElement
		const btn = root.querySelector('#btn') as HTMLButtonElement
		const txt = root.querySelector('#txt') as HTMLInputElement
		const cb = root.querySelector('#cb') as HTMLInputElement

		expect(root.firstChild?.textContent).toBe('hello')
		expect(btn.getAttribute('data-x')).toBe('1')
		expect(btn.hasAttribute('hidden')).toBe(true)
		expect(txt.value).toBe('abc')
		expect(cb.checked).toBe(true)
		expect(btn.className).toBe('a')
		expect(btn.getAttribute('style')).toContain('color')

		btn.click()
		expect(clicks).toBe(1)

		mounted.update({
			text: 'world',
			dataX: null,
			hidden: false,
			value: 'def',
			checked: false,
			className: 'b',
			style: 'color: blue;',
			onClick: () => {
				clicks += 10
			},
		})

		expect(root.firstChild?.textContent).toBe('world')
		expect(btn.getAttribute('data-x')).toBe(null)
		expect(btn.hasAttribute('hidden')).toBe(false)
		expect(txt.value).toBe('def')
		expect(cb.checked).toBe(false)
		expect(btn.className).toBe('b')
		expect(btn.getAttribute('style')).toContain('blue')

		btn.click()
		expect(clicks).toBe(11)

		mounted.destroy()
	})

	it('SVG: xlink attributes are namespaced and update correctly', () => {
		const h = host()

		const def = defineBlock({
			templateHTML: `<svg xmlns="http://www.w3.org/2000/svg"><use></use></svg>`,
			slots: {
				href: { kind: 'attr', path: [0], name: 'xlink:href' },
			},
		})

		const mounted = mountBlock(def, h, { href: '#a' })
		const root = mounted.root as SVGSVGElement
		const use = root.querySelector('use') as SVGUseElement

		// In jsdom, namespaced attributes still serialize under getAttribute.
		expect(use.getAttribute('xlink:href')).toBe('#a')

		mounted.update({ href: '#b' })
		expect(use.getAttribute('xlink:href')).toBe('#b')

		mounted.destroy()
	})
})
