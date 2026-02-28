import { describe, expect, it } from 'vitest'
import * as babel from '@babel/core'

import { hrbrJsxTransform } from '../index'

function transform(code: string) {
	return babel.transformSync(code, {
		filename: 'app.tsx',
		plugins: [[hrbrJsxTransform, { runtimeImport: 'relax/hrbr' }]],
		parserOpts: { plugins: ['typescript', 'jsx'] },
		configFile: false,
		babelrc: false,
	})
}

describe('compiler/jsx babel transform (errors)', () => {
	it('throws for event handlers', () => {
		expect(() =>
			transform(`const App = () => <button onClick={() => {}}>Hi</button>`)
		).toThrow(/Event handlers|onClick|fallback/i)
	})

	it('throws for spread attributes', () => {
		expect(() => transform(`const App = () => <div {...props} />`)).toThrow(/spread attributes|\{\.\.\./i)
	})

	it('throws for fragments', () => {
		expect(() => transform(`const App = () => (<><div /></>)`)).toThrow(/fragments|<>|fallback/i)
	})

	it('throws for non-intrinsic tags (components)', () => {
		expect(() => transform(`const App = () => <Foo />`)).toThrow(/intrinsic|lowercase|components/i)
	})
})
