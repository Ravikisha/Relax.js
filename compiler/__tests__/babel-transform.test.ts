import { describe, expect, it } from 'vitest'
import * as babel from '@babel/core'

import { hrbrJsxTransform } from '../index'

describe('compiler/jsx babel transform (scaffold)', () => {
	it('loads and can parse JSX', () => {
		const input = `const App = () => <div className={count()}>Hi</div>`
		const out = babel.transformSync(input, {
			filename: 'app.tsx',
			plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr' }]],
			parserOpts: { plugins: ['typescript', 'jsx'] },
			configFile: false,
			babelrc: false,
		})

		const code = out?.code ?? ''
		expect(code).toContain('import')
		expect(code).toContain('defineBlock')
		expect(code).toContain('mountCompiledBlock')
		expect(code).toContain('const __hrbr_block_0')
		expect(code).toContain('templateHTML')
		expect(code).toContain('slots')
		expect(code).toContain('host =>')
	})

	it('supports nested elements and dynamic text children (v1 subset)', () => {
		const input = `
			const App = () => (
				<div className={cls()}>
					<span>Hello {name()}</span>
				</div>
			)
		`
		const out = babel.transformSync(input, {
			filename: 'app.tsx',
			plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr' }]],
			parserOpts: { plugins: ['typescript', 'jsx'] },
			configFile: false,
			babelrc: false,
		})

		const code = out?.code ?? ''
		// we should have at least one text slot with a non-empty path (under <span>)
		expect(code).toContain('kind')
	expect(code).toMatch(/kind:\s*"text"/)
	expect(code).toMatch(/path:\s*\[[0-9]+,\s*[0-9]+\]/)
		// and a template with nested tags
		expect(code).toContain('<div')
		expect(code).toContain('<span')
	})

	it('propagates /*@lane <name>*/ pragmas into slot metadata', () => {
		const input = `
			const App = () => (
				<div className={/*@lane transition*/ cls()} data-x={/*@lane input*/ x()} />
			)
		`

		const out = babel.transformSync(input, {
			filename: 'app.tsx',
			plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr' }]],
			parserOpts: { plugins: ['typescript', 'jsx'] },
			configFile: false,
			babelrc: false,
		})

		const code = out?.code ?? ''
		expect(code).toMatch(/lane:\s*"transition"/)
		expect(code).toMatch(/lane:\s*"input"/)
	})

	it('snapshot: emits stable block def + slots + wrapper call', () => {
		const input = `
			const App = () => (
				<section id="root" className={cls()}>
					<h1>Title</h1>
					<p>Hello {name()}</p>
				</section>
			)
		`

		const out = babel.transformSync(input, {
			filename: 'app.tsx',
			plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr' }]],
			parserOpts: { plugins: ['typescript', 'jsx'] },
			configFile: false,
			babelrc: false,
		})

		const normalized = (out?.code ?? '').replace(/^\s+/gm, '')
		expect(normalized).toMatchInlineSnapshot(`"import { defineBlock, mountCompiledBlock } from \"relax/hrbr\";
const __hrbr_block_0 = defineBlock({
templateHTML: \"<section id=\\\"root\\\" class=\\\"\\\">\\n\\t\\t\\t\\t\\t<h1>Title</h1>\\n\\t\\t\\t\\t\\t<p>Hello  </p>\\n\\t\\t\\t\\t</section>\",
slots: {
\"s0\": {
kind: \"class\",
path: []
},
\"s1\": {
kind: \"text\",
path: [3, 1]
}
}
});
const App = () => host => __hrbrBlock(host, __hrbr_block_0, [{
key: \"s0\",
read: () => cls()
}, {
key: \"s1\",
read: () => name()
}]);
function __hrbrBlock(host, def, slots) {
return mountCompiledBlock(def, host, slots);
}"`)
	})

	it('dev mode: emits stable slot keys (location-based) for easier debugging', () => {
		const input = `
			const App = () => (
				<div className={cls()}>
					<span>Hello {name()}</span>
				</div>
			)
		`
		const out = babel.transformSync(input, {
			filename: 'app.tsx',
			plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr', dev: true }]],
			parserOpts: { plugins: ['typescript', 'jsx'] },
			configFile: false,
			babelrc: false,
		})

		const code = out?.code ?? ''
		// Expect location-based slot keys of the form: s_<kind>_<line>:<col>
		expect(code).toMatch(/"s_(class|style|attr|text)_[0-9]+:[0-9]+"/)
	})

	it('source maps: emitted when Babel sourceMaps is enabled', () => {
		const input = `const App = () => <div className={cls()}>Hi</div>`
		const out = babel.transformSync(input, {
			filename: 'app.tsx',
			plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr', dev: true }]],
			parserOpts: { plugins: ['typescript', 'jsx'] },
			configFile: false,
			babelrc: false,
			sourceMaps: true,
		}) as any

		expect(out?.map).toBeTruthy()
		// Basic sanity: map should have at least one source.
		const m = out?.map as any
		expect(Array.isArray(m?.sources)).toBe(true)
		expect((m?.sources ?? []).length).toBeGreaterThan(0)
	})
})
