import ts from 'typescript'
import type { BlockDef, BlockSlot, CompiledSlot } from '../runtime/block'

export { hrbrJsxTransform } from './jsx'
export type { HrbrJsxTransformOptions } from './jsx'

export type CompileResult = {
	block: BlockDef
	slots: CompiledSlot[]
	meta: CompileMeta
}

export type CompileOrFallbackResult =
	| ({ kind: 'block' } & CompileResult)
	| {
			kind: 'fallback'
			reason: 'dynamic-structure'
			meta: CompileMeta
		}

export type CompileOptions = {
	/** Optional filename used by the TS parser (helps with diagnostics) */
	fileName?: string
	/**
	 * When true, disallow dynamic tag names and other constructs that can't be represented as an HTML template.
	 * Defaults to true.
	 */
	strictTemplate?: boolean
}

	export type CompileMeta = {
		/** True when we detect patterns that require a structural reconciler (loops, conditionals, spreads, components, etc). */
		hasDynamicStructure: boolean
		/** Per-slot lane hint (if any). */
		lanesByKey: Record<string, string>
		/** Per-slot heuristic: looks like a signal getter call `foo()` */
		signalLikeByKey: Record<string, boolean>
	}

type TemplateBuild = {
	html: string
	slots: Record<string, BlockSlot>
	reads: Array<{ key: string; code: string }>
	meta: CompileMeta
}

type PathState = {
	/** next childNodes index within the current parent (counts text + elements) */
	childIndex: number
}

const VOID_TAGS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
])

/**
 * Compile a single-root TSX expression like:
 *   `(<div className={cls}>Hello {name()}</div>)`
 * into a `BlockDef` + `{ key, read }[]` compatible with `mountCompiledBlock()`.
 */
export function compileTSXToBlock(source: string, opts: CompileOptions = {}): CompileResult {
	const fileName = opts.fileName ?? 'compiled.tsx'
	const strictTemplate = opts.strictTemplate ?? true

	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)

		let expr = findFirstExpression(sf)
	if (!expr) {
		throw new Error('[hrbr/compiler] Expected a TS/TSX expression in source')
	}

		expr = unwrapParens(expr)

	if (!ts.isJsxElement(expr) && !ts.isJsxSelfClosingElement(expr)) {
		throw new Error('[hrbr/compiler] Only a single JSX element root is supported for now')
	}

		const build = buildTemplate(expr, sf, strictTemplate)
	const block: BlockDef = { templateHTML: build.html, slots: build.slots }

		// Phase 5 compiler returns `block` + static slot metadata.
		// Runtime reads are supplied by the caller (who has access to the lexical scope).
		return { block, slots: [], meta: build.meta }
}

/**
 * Convenience wrapper that decides whether to use HRBR block runtime or fall back to the VDOM reconciler.
 *
 * Phase 5 responsibilities:
 * - detect dynamic structure
 * - route accordingly
 */
export function compileTSXOrFallback(source: string, opts: CompileOptions = {}): CompileOrFallbackResult {
	const res = compileTSXToBlock(source, opts)
	if (res.meta.hasDynamicStructure) {
		return { kind: 'fallback', reason: 'dynamic-structure', meta: res.meta }
	}
	return { kind: 'block', ...res }
}

function unwrapParens(expr: ts.Expression): ts.Expression {
	let e: ts.Expression = expr
	while (ts.isParenthesizedExpression(e)) e = e.expression
	return e
}

function findFirstExpression(sf: ts.SourceFile): ts.Expression | null {
	for (const st of sf.statements) {
		if (ts.isExpressionStatement(st)) return st.expression
		if (ts.isVariableStatement(st)) {
			for (const decl of st.declarationList.declarations) {
				if (decl.initializer) return decl.initializer
			}
		}
		if (ts.isReturnStatement(st) && st.expression) return st.expression
	}
	return null
}

function buildTemplate(
	root: ts.JsxElement | ts.JsxSelfClosingElement,
	sf: ts.SourceFile,
	strictTemplate: boolean
): TemplateBuild {
	const state = {
		nextKey: 0,
		slots: Object.create(null) as Record<string, BlockSlot>,
		reads: [] as Array<{ key: string; code: string }>,
		meta: {
			hasDynamicStructure: false,
			lanesByKey: Object.create(null) as Record<string, string>,
			signalLikeByKey: Object.create(null) as Record<string, boolean>,
		} satisfies CompileMeta,
	}

			const out = renderJSX(root, sf, state, [], strictTemplate, { childIndex: 0 })
			return { html: out, slots: state.slots, reads: state.reads, meta: state.meta }
}

function renderJSX(
	node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | ts.JsxChild,
	sf: ts.SourceFile,
		state: { nextKey: number; slots: Record<string, BlockSlot>; reads: Array<{ key: string; code: string }>; meta: CompileMeta },
	pathToHere: number[],
	strictTemplate: boolean,
	pathState: PathState
): string {
	if (ts.isJsxText(node)) {
		// Keep whitespace as-is; browsers will normalize in template parsing anyway.
		const txt = node.getText(sf)
		if (txt.length > 0) pathState.childIndex++
		return escapeText(txt)
	}

	if (ts.isJsxExpression(node)) {
		if (!node.expression) return ''

		// Dynamic expressions in children imply dynamic structure (conditionals, list rendering, etc).
		state.meta.hasDynamicStructure = true

		const key = `s${state.nextKey++}`
		const code = node.expression.getText(sf)
		// The placeholder becomes a text node we can target.
		// In template parsing, this yields: Text(""), Comment("...), Text("...") depending on content,
		// so keep it minimal with a unique sentinel.
		const sentinel = `__hrbr_${key}__`
		state.slots[key] = { kind: 'text', path: [...pathToHere, pathState.childIndex++] }
		state.reads.push({ key, code })
		state.meta.signalLikeByKey[key] = looksLikeSignalGetter(node.expression)
		return escapeText(sentinel)
	}

	if (ts.isJsxFragment(node)) {
		// For Phase 5 MVP: fragments are treated as concatenated children (no wrapper).
		return node.children.map((c) => renderJSX(c, sf, state, pathToHere, strictTemplate, pathState)).join('')
	}

	// Elements
	if (ts.isJsxSelfClosingElement(node)) {
		const tag = getIntrinsicTagName(node.tagName, sf, strictTemplate)

		// If tag is not a plain html tag, it's dynamic structure.
		if (!/^[a-z]/.test(tag)) state.meta.hasDynamicStructure = true
		const myIndex = pathState.childIndex++
		const myPath = pathToHere.length === 0 ? [] : [...pathToHere, myIndex]
		const attrs = renderAttributes(node.attributes, sf, state, myPath, strictTemplate)
		if (VOID_TAGS.has(tag.toLowerCase())) return `<${tag}${attrs}>`
		return `<${tag}${attrs}></${tag}>`
	}

	if (ts.isJsxElement(node)) {
		const tag = getIntrinsicTagName(node.openingElement.tagName, sf, strictTemplate)

		if (!/^[a-z]/.test(tag)) state.meta.hasDynamicStructure = true
		const myIndex = pathState.childIndex++
		const myPath = pathToHere.length === 0 ? [] : [...pathToHere, myIndex]
		const attrs = renderAttributes(node.openingElement.attributes, sf, state, myPath, strictTemplate)

		const childState: PathState = { childIndex: 0 }
		const children = node.children.map((c) => renderJSX(c, sf, state, myPath, strictTemplate, childState))

		return `<${tag}${attrs}>${children.join('')}</${tag}>`
	}

	// Unsupported child kinds (e.g. spread children)
	return ''
}

function getIntrinsicTagName(tagName: ts.JsxTagNameExpression, sf: ts.SourceFile, strictTemplate: boolean): string {
	if (ts.isIdentifier(tagName)) return tagName.text
	if (ts.isPropertyAccessExpression(tagName)) {
		if (strictTemplate) throw new Error('[hrbr/compiler] Dynamic/compound tag names are not supported in template mode')
		return tagName.getText(sf)
	}
	if (strictTemplate) throw new Error('[hrbr/compiler] Unsupported tag name expression in template mode')
	return tagName.getText(sf)
}

function renderAttributes(
	attrs: ts.JsxAttributes,
	sf: ts.SourceFile,
	state: { nextKey: number; slots: Record<string, BlockSlot>; reads: Array<{ key: string; code: string }>; meta: CompileMeta },
	pathToElement: number[],
	strictTemplate: boolean
): string {
	if (attrs.properties.length === 0) return ''

	let out = ''

	for (const prop of attrs.properties) {
		if (ts.isJsxSpreadAttribute(prop)) {
			if (strictTemplate) throw new Error('[hrbr/compiler] {...spread} attributes not supported in template mode yet')
		state.meta.hasDynamicStructure = true
			continue
		}

		const rawName = jsxAttrNameToString(prop.name)
		const normalized = normalizeAttrName(rawName)

		// Boolean shorthand: <div hidden />
		if (!prop.initializer) {
			out += ` ${normalized}`
			continue
		}

		// String literal: <div id="x" />
		if (ts.isStringLiteral(prop.initializer)) {
			out += ` ${normalized}="${escapeAttr(prop.initializer.text)}"`
			continue
		}

		// JSX expression: <div className={expr} onClick={fn} />
		if (ts.isJsxExpression(prop.initializer)) {
			const expr = prop.initializer.expression
			if (!expr) {
				out += ` ${normalized}=""`
				continue
			}

			// Events can't be represented in HTML template; skip them.
			if (isEventProp(rawName)) {
				if (strictTemplate) {
					// ignore silently for now; wiring events is Phase 6+ fallback.
				}
						state.meta.hasDynamicStructure = true
				continue
			}

			const key = `s${state.nextKey++}`
			const code = expr.getText(sf)

					// Lane annotations via JSX comment pragma in expression:
					//   className={/*@lane transition*/ cls()}
					const lane = extractLanePragma(prop.initializer)
					if (lane) state.meta.lanesByKey[key] = lane
					state.meta.signalLikeByKey[key] = looksLikeSignalGetter(expr)

			if (normalized === 'class') {
				state.slots[key] = { kind: 'class', path: pathToElement }
				state.reads.push({ key, code })
				out += ` class=""`
				continue
			}

			if (normalized === 'style') {
				state.slots[key] = { kind: 'style', path: pathToElement }
				state.reads.push({ key, code })
				out += ` style=""`
				continue
			}

			// Prefer prop slots for known DOM props.
			if (isDomPropName(normalized)) {
				state.slots[key] = { kind: 'prop', path: pathToElement, name: normalized }
				state.reads.push({ key, code })
				// Keep a stable attribute in template; prop update will do the real work.
				out += ` ${normalized}=""`
				continue
			}

			state.slots[key] = { kind: 'attr', path: pathToElement, name: normalized }
			state.reads.push({ key, code })
			out += ` ${normalized}=""`
			continue
		}

		// Fallback: treat everything else as string.
		out += ` ${normalized}="${escapeAttr(prop.initializer.getText(sf))}"`
	}

	return out
}

function isDomPropName(name: string): boolean {
	// Small allowlist for Phase 5 (keeps compiler deterministic in non-browser envs).
	return name === 'value' || name === 'checked' || name === 'selected' || name === 'disabled'
}

function looksLikeSignalGetter(expr: ts.Expression): boolean {
	const e = unwrapParens(expr)
	// Heuristic: `foo()` or `foo.bar()` with zero args (common signal getter shape)
	if (!ts.isCallExpression(e)) return false
	if (e.arguments.length !== 0) return false
	if (ts.isIdentifier(e.expression)) return true
	if (ts.isPropertyAccessExpression(e.expression)) return true
	return false
}

function extractLanePragma(expr: ts.JsxExpression): string | null {
	// We only support a single pragma form inside the expression:
	//   {/*@lane transition*/ someExpr}
	// TypeScript exposes comments via ts.getLeadingCommentRanges on the expression text.
	const inner = expr.expression
	if (!inner) return null

	const text = expr.getText()
	const commentRanges = ts.getLeadingCommentRanges(text, 0) ?? []
	for (const r of commentRanges) {
		const c = text.slice(r.pos, r.end)
		const m = /@lane\s+(sync|input|default|transition|idle)/.exec(c)
		if (m && m[1]) return m[1]
	}
	return null
}

function normalizeAttrName(name: string): string {
	if (name === 'className') return 'class'
	return name
}

function isEventProp(name: string): boolean {
	return /^on[A-Z]/.test(name)
}

function jsxAttrNameToString(name: ts.JsxAttributeName): string {
	if (ts.isIdentifier(name)) return name.text
	if (ts.isJsxNamespacedName(name)) {
		return `${name.namespace.text}:${name.name.text}`
	}
	// Should be unreachable.
	return (name as any).getText?.() ?? String(name)
}

function escapeText(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(text: string): string {
	return escapeText(text).replace(/"/g, '&quot;')
}

