import { describe, expect, it } from 'vitest'
import * as babel from '@babel/core'

import { hrbrJsxTransform } from '../index'
import { defineBlock, mountCompiledBlock } from '../../runtime/block'
import { createSignal } from '../../runtime/signals'

function compile(input: string): string {
	const out = babel.transformSync(input, {
		filename: 'app.tsx',
		plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr' }]],
		parserOpts: { plugins: ['typescript', 'jsx'] },
		configFile: false,
		babelrc: false,
	})
	return out?.code ?? ''
}

// Very small extractor tailored to the known code shape emitted by the current Babel plugin.
function extractDefineBlockObjectLiteral(code: string): string {
	const marker = 'defineBlock('
	const i = code.indexOf(marker)
	if (i < 0) throw new Error('defineBlock(...) not found in transformed output')

	const start = code.indexOf('{', i)
	if (start < 0) throw new Error('defineBlock object literal not found')

	let depth = 0
	let inStr: '"' | "'" | null = null
	let esc = false
	for (let p = start; p < code.length; p++) {
		const ch = code[p]!
		if (inStr) {
			if (esc) {
				esc = false
				continue
			}
			if (ch === '\\') {
				esc = true
				continue
			}
			if (ch === inStr) inStr = null
			continue
		}
		if (ch === '"' || ch === "'") {
			inStr = ch
			continue
		}
		if (ch === '{') depth++
		else if (ch === '}') {
			depth--
			if (depth === 0) return code.slice(start, p + 1)
		}
	}
	throw new Error('Unbalanced braces while extracting defineBlock literal')
}

function extractCompiledSlotsArrayLiteral(code: string): string {
	const marker = '__hrbrBlock(host,'
	const i = code.indexOf(marker)
	if (i < 0) throw new Error('__hrbrBlock(host, ...) call not found')

	// Find the third argument: [...]
	const arrStart = code.indexOf('[', i)
	if (arrStart < 0) throw new Error('slots array literal not found')

	let depth = 0
	let inStr: '"' | "'" | null = null
	let esc = false
	for (let p = arrStart; p < code.length; p++) {
		const ch = code[p]!
		if (inStr) {
			if (esc) {
				esc = false
				continue
			}
			if (ch === '\\') {
				esc = true
				continue
			}
			if (ch === inStr) inStr = null
			continue
		}
		if (ch === '"' || ch === "'") {
			inStr = ch
			continue
		}
		if (ch === '[') depth++
		else if (ch === ']') {
			depth--
			if (depth === 0) return code.slice(arrStart, p + 1)
		}
	}
	throw new Error('Unbalanced brackets while extracting compiled slots array')
}

describe('compiler/jsx babel transform (jsdom e2e)', () => {
	it('mounts and updates the transformed output in jsdom (text + class) without recreating the root element', async () => {
		const [name, setName] = createSignal('Ada')
		const [cls] = createSignal('a')

		const input = `
			const App = () => (
				<section id="root" className={cls()}>
					<p>{name()}</p>
				</section>
			)
		`

		const code = compile(input)
		const defObj = extractDefineBlockObjectLiteral(code)
		const slotsArr = extractCompiledSlotsArrayLiteral(code)

		// Evaluate just the data structures, supplying cls()/name() from this test scope.
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const defLiteral = new Function('defineBlock', `return defineBlock(${defObj});`)(defineBlock)
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const compiledSlots = new Function('cls', 'name', `return (${slotsArr});`)(() => cls(), () => name())

		const host = document.createElement('div')
		const mounted = mountCompiledBlock(defLiteral, host, compiledSlots)

		const root1 = host.querySelector('section') as HTMLElement | null
		expect(root1).not.toBeNull()
		expect(root1?.getAttribute('id')).toBe('root')
		expect(root1?.getAttribute('class')).toBe('a')
		expect(host.textContent).toContain('Ada')

		setName('Grace')
		// updates are scheduled via the HRBR scheduler (setTimeout-based in tests)
		await new Promise<void>((r) => setTimeout(r, 0))

		const root2 = host.querySelector('section') as HTMLElement | null
		expect(root2).toBe(root1)
		expect(host.textContent).toContain('Grace')

		mounted.dispose()
	})
})
