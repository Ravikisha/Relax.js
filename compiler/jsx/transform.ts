import { declare } from '@babel/helper-plugin-utils'
import syntaxJsx from '@babel/plugin-syntax-jsx'
import type { PluginObj } from '@babel/core'

// Production compiler plan: this becomes the HRBR JSX transform.
//
// Phase 1 (this commit): wire up a real Babel plugin scaffold so we can
// incrementally add template extraction + slot codegen.

export type HrbrJsxTransformOptions = {
	/** Import path to HRBR runtime helpers in generated output */
	runtimeImport?: string
	/** Function name used as the mount wrapper that returns a MountedBlock */
	mountWrapperName?: string
	/**
	 * Dev mode: emit more readable/stable identifiers and extra metadata intended for debugging.
	 *
	 * Notes:
	 * - This does not change runtime semantics.
	 * - Sourcemap generation itself is controlled by Babel (`sourceMaps: true`).
	 */
	dev?: boolean
	/**
	 * When true, attempt to derive stable slot keys from source locations.
	 * Defaults to `opts.dev`.
	 */
	stableSlotKeys?: boolean
}

type SlotKind = 'text' | 'attr' | 'prop' | 'class' | 'style'

type SlotSpec = {
	key: string
	kind: SlotKind
	path: number[]
	name?: string
	expr: any
}

export default declare((api: { assertVersion(v: number): void }, opts: HrbrJsxTransformOptions = {}): PluginObj => {
	api.assertVersion(7)

	const runtimeImport = opts.runtimeImport ?? 'relax/hrbr'
	const mountWrapperName = opts.mountWrapperName ?? '__hrbrBlock'
	const dev = opts.dev ?? false
	const stableSlotKeys = opts.stableSlotKeys ?? dev
	let needsRuntimeImport = false
	let needsFallbackImport = false
	let needsWrapper = false
	let nextBlockId = 0
	let currentFileName: string | undefined
	let currentFileCode: string | undefined

	function fail(path: any, message: string): never {
		const loc = path?.node?.loc?.start
		const where = loc ? `:${loc.line}:${loc.column}` : ''
		const file = currentFileName ?? 'unknown'
		// Prefer Babel's code-frame errors when available.
		const maybe = path?.buildCodeFrameError ? path.buildCodeFrameError(`[hrbr/jsx] ${message}`) : null
		if (maybe) throw maybe
		throw new Error(`[hrbr/jsx] ${message} (${file}${where})\n` + (currentFileCode ?? ''))
	}

	function ensureRuntimeImport(programPath: any) {
		if (!needsRuntimeImport) return
		// import { defineBlock, mountCompiledBlock, mountFallback } from 'relax/hrbr'
		const t = programPath.hub.file.scope.buildUndefinedNode().constructor
		// We can't rely on Babel types being typed here (shim), so use string template nodes.
		const imp = programPath.hub.file.addImport
			? null
			: null
		void t
		void imp

		// Fallback: build import via `programPath.unshiftContainer` with a raw node shape.
		const specifiers: any[] = [
			{ type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'defineBlock' }, local: { type: 'Identifier', name: 'defineBlock' } },
			{ type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'mountCompiledBlock' }, local: { type: 'Identifier', name: 'mountCompiledBlock' } },
		]
		if (needsFallbackImport) {
			specifiers.push({ type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'mountFallback' }, local: { type: 'Identifier', name: 'mountFallback' } })
		}

		programPath.unshiftContainer('body', {
			type: 'ImportDeclaration',
			specifiers,
			source: { type: 'StringLiteral', value: runtimeImport },
		})

		needsRuntimeImport = false
		needsFallbackImport = false
	}

	function ensureWrapper(programPath: any) {
		if (!needsWrapper) return
		// function __hrbrBlock(host, def, slots) { return mountCompiledBlock(def, host, slots) }
		programPath.pushContainer('body', {
			type: 'FunctionDeclaration',
			id: { type: 'Identifier', name: mountWrapperName },
			params: [
				{ type: 'Identifier', name: 'host' },
				{ type: 'Identifier', name: 'def' },
				{ type: 'Identifier', name: 'slots' },
			],
			body: {
				type: 'BlockStatement',
				body: [
					{
						type: 'ReturnStatement',
						argument: {
							type: 'CallExpression',
							callee: { type: 'Identifier', name: 'mountCompiledBlock' },
							arguments: [
								{ type: 'Identifier', name: 'def' },
								{ type: 'Identifier', name: 'host' },
								{ type: 'Identifier', name: 'slots' },
							],
						},
					},
				],
			},
		})

		needsWrapper = false
	}

	function normalizeAttrName(name: string) {
		return name === 'className' ? 'class' : name
	}

	function escapeText(s: string) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
	}

	function escapeAttr(s: string) {
		return escapeText(s).replace(/"/g, '&quot;')
	}

	function getJsxName(node: any): string | null {
		if (!node) return null
		if (node.type === 'JSXIdentifier') return node.name
		return null
	}

	function buildTemplateFromJsxElement(elPath: any): { templateHTML: string; slots: Record<string, any>; compiledSlots: any[] } | null {
		const slotMap: Record<string, any> = Object.create(null)
		const compiledSlots: any[] = []
		let slotId = 0
		const usedKeys = new Set<string>()

		function getLocKey(node: any): string | null {
			const loc = node?.loc?.start
			if (!loc) return null
			// 1-based line, 0-based column => keep as-is but include both.
			return `${loc.line}:${loc.column}`
		}

		function allocSlotKey(hintNode: any, kind: SlotKind, extra?: string): string {
			if (stableSlotKeys) {
				const locKey = getLocKey(hintNode)
				if (locKey) {
					const base = `s_${kind}_${locKey}${extra ? `_${extra}` : ''}`
					let k = base
					let n = 1
					while (usedKeys.has(k)) k = `${base}_${n++}`
					usedKeys.add(k)
					return k
				}
			}
			const k = `s${slotId++}`
			usedKeys.add(k)
			return k
		}

		function isTextLikeExpr(expr: any): boolean {
			if (!expr) return true
			// These expression kinds are not safe to treat as textContent.
			if (expr.type === 'JSXElement' || expr.type === 'JSXFragment') return false
			// Structural expressions imply dynamic DOM presence.
			if (expr.type === 'ConditionalExpression' || expr.type === 'LogicalExpression') return false
			if (expr.type === 'ConditionalExpression') {
				return isTextLikeExpr(expr.consequent) && isTextLikeExpr(expr.alternate)
			}
			if (expr.type === 'LogicalExpression') {
				return isTextLikeExpr(expr.left) && isTextLikeExpr(expr.right)
			}
			if (expr.type === 'SequenceExpression') {
				const last = expr.expressions?.[expr.expressions.length - 1]
				return isTextLikeExpr(last)
			}
			return true
		}

		function extractLanePragmaFromExpressionContainer(node: any): string | null {
			// Support the same pragma style as the TS compiler:
			//   className={/*@lane transition*/ cls()}
			// Babel preserves comments on nodes in most configs.
			const expr = node?.expression
			const comments = (expr?.leadingComments ?? node?.leadingComments ?? []) as any[]
			for (const c of comments) {
				const text = (c?.value ?? '').toString()
				const m = /@lane\s+(sync|input|default|transition|idle)/.exec(text)
				if (m && m[1]) return m[1]
			}
			return null
		}

		function pushCompiledSlot(key: string, expr: any) {
			compiledSlots.push({
				type: 'ObjectExpression',
				properties: [
					{ type: 'ObjectProperty', key: { type: 'Identifier', name: 'key' }, value: { type: 'StringLiteral', value: key }, shorthand: false },
					{ type: 'ObjectProperty', key: { type: 'Identifier', name: 'read' }, value: { type: 'ArrowFunctionExpression', params: [], body: expr, expression: true }, shorthand: false },
				],
			})
		}

		function renderElement(node: any, pathToHere: number[], childIndexRef: { i: number }): string | null {
			const tag = getJsxName(node.openingElement?.name)
			if (!tag || !/^[a-z]/.test(tag)) return null

			const attrsPath = pathToHere
			let attrsHtml = ''
			for (const attr of node.openingElement.attributes as any[]) {
				if (attr.type !== 'JSXAttribute') return null
				const rawName = attr.name?.name
				if (typeof rawName !== 'string') return null
				const name = normalizeAttrName(rawName)

				// Events not supported in block mode yet.
				if (/^on[A-Z]/.test(rawName)) return null

				if (!attr.value) {
					attrsHtml += ` ${name}`
					continue
				}

				if (attr.value.type === 'StringLiteral') {
					attrsHtml += ` ${name}="${escapeAttr(attr.value.value)}"`
					continue
				}

				if (attr.value.type === 'JSXExpressionContainer') {
					const expr = attr.value.expression
					const kind: SlotKind =
						name === 'class' ? 'class' : name === 'style' ? 'style' : 'attr'
					const key = allocSlotKey(attr.value, kind, name === 'attr' ? normalizeAttrName(name) : undefined)
					const lane = extractLanePragmaFromExpressionContainer(attr.value)

					if (name === 'class') {
						slotMap[key] = { kind: 'class', path: attrsPath, ...(lane ? { lane } : null) }
						attrsHtml += ` class=""`
					} else if (name === 'style') {
						slotMap[key] = { kind: 'style', path: attrsPath, ...(lane ? { lane } : null) }
						attrsHtml += ` style=""`
					} else {
						slotMap[key] = { kind: 'attr', path: attrsPath, name, ...(lane ? { lane } : null) }
						attrsHtml += ` ${name}=""`
					}

					pushCompiledSlot(key, expr)
					continue
				}

				return null
			}

			const isVoid = /^area$|^base$|^br$|^col$|^embed$|^hr$|^img$|^input$|^link$|^meta$|^param$|^source$|^track$|^wbr$/i.test(tag)
			if (isVoid) {
				childIndexRef.i++
				return `<${tag}${attrsHtml}>`
			}

			// children render into their own childIndex space
			const childState = { i: 0 }
			let inner = ''
			for (const ch of node.children as any[]) {
				if (ch.type === 'JSXText') {
					if (ch.value.length > 0) {
						inner += escapeText(ch.value)
						childState.i++
					}
					continue
				}
				if (ch.type === 'JSXExpressionContainer') {
					const expr = ch.expression
					if (!expr) continue
					// If the expression can yield elements/structures, block mode can't represent it.
					// Route to fallback reconciler instead.
					if (!isTextLikeExpr(expr)) return null
					const key = allocSlotKey(ch, 'text')
					// Emit a sentinel text node in the template so the path points to a real node.
					// The block runtime will later update this node's textContent.
					inner += ' '
					slotMap[key] = { kind: 'text', path: [...pathToHere, childState.i++] }
					pushCompiledSlot(key, expr)
					continue
				}
				if (ch.type === 'JSXElement') {
					const myIndex = childState.i++
					const out = renderElement(ch, [...pathToHere, myIndex], { i: 0 })
					if (out == null) return null
					inner += out
					continue
				}
				// Anything else is not supported in block mode yet.
				return null
			}

			childIndexRef.i++
			return `<${tag}${attrsHtml}>${inner}</${tag}>`
		}

		const el = elPath.node
		if (!el || el.type !== 'JSXElement') return null

		const rootOut = renderElement(el, [], { i: 0 })
		if (rootOut == null) return null
		return { templateHTML: rootOut, slots: slotMap, compiledSlots }
	}

	return {
		name: 'relax-hrbr-jsx-transform',
		inherits: syntaxJsx as any,
		visitor: {
			Program: {
				enter(path: any) {
					// reset file state
					needsRuntimeImport = false
					needsFallbackImport = false
					needsWrapper = false
					nextBlockId = 0
					currentFileName = path?.hub?.file?.opts?.filename
					currentFileCode = path?.hub?.file?.code
					void path
				},
				exit(path: any) {
					ensureRuntimeImport(path)
					ensureWrapper(path)
				},
			},
			JSXElement(path: any) {
				// Only transform when it's in an Expression position.
				if (!path.parentPath) return

				const built = buildTemplateFromJsxElement(path)
				if (!built) {
					// Fallback routing: compile a minimal structural mount using mountFallback().
					const node = path.node
					const rootTag = getJsxName(node?.openingElement?.name)
					if (!rootTag || !/^[a-z]/.test(rootTag)) {
						fail(path, 'Fallback routing currently supports intrinsic lowercase root tags only.')
					}

					function jsxAttrToKeyExpr(openingEl: any): any | null {
						for (const attr of openingEl?.attributes ?? []) {
							if (attr?.type !== 'JSXAttribute') continue
							const rawName = attr.name?.name
							if (rawName !== 'key') continue
							const v = attr.value
							if (!v) return null
							if (v.type === 'StringLiteral') return { type: 'StringLiteral', value: v.value }
							if (v.type === 'JSXExpressionContainer') return v.expression
							return null
						}
						return null
					}

					function childrenToTextExpr(children: any[]): any {
						// Very small subset: concatenate JSXText + expression containers into one string.
						const parts: any[] = []
						for (const ch of children ?? []) {
							if (ch?.type === 'JSXText') {
								const txt = ch.value ?? ''
								if (txt.length > 0) parts.push({ type: 'StringLiteral', value: txt })
								continue
							}
							if (ch?.type === 'JSXExpressionContainer') {
								if (!ch.expression) continue
								parts.push(ch.expression)
								continue
							}
							// Anything else -> we can't safely express it in this minimal fallback.
							fail(path, 'Fallback routing: unsupported child node in this minimal fallback transform (expected text/expressions only).')
						}
						if (parts.length === 0) return { type: 'StringLiteral', value: '' }
						let expr = parts[0]!
						for (let i = 1; i < parts.length; i++) {
							expr = { type: 'BinaryExpression', operator: '+', left: expr, right: parts[i]! }
						}
						return expr
					}

					function elementToReconcileSpec(el: any): any {
						const tag = getJsxName(el?.openingElement?.name)
						if (!tag || !/^[a-z]/.test(tag)) {
							fail(path, 'Fallback routing only supports intrinsic lowercase tags for now.')
						}
						// Only allow static string attributes (non-event) for now.
						const setAttrsStmts: any[] = []
						for (const a of el.openingElement?.attributes ?? []) {
							if (a?.type !== 'JSXAttribute') {
								fail(path, 'Fallback routing does not support spread attributes yet.')
							}
							const n = a.name?.name
							if (typeof n !== 'string') continue
							if (n === 'key') continue
							if (/^on[A-Z]/.test(n)) {
								fail(path, 'Fallback routing does not support event handlers yet.')
							}
							if (!a.value) {
								setAttrsStmts.push({
									type: 'ExpressionStatement',
									expression: {
										type: 'CallExpression',
										callee: { type: 'MemberExpression', object: { type: 'Identifier', name: 'el' }, property: { type: 'Identifier', name: 'setAttribute' } },
										arguments: [{ type: 'StringLiteral', value: n }, { type: 'StringLiteral', value: '' }],
									},
								})
								continue
							}
							if (a.value.type === 'StringLiteral') {
								setAttrsStmts.push({
									type: 'ExpressionStatement',
									expression: {
										type: 'CallExpression',
										callee: { type: 'MemberExpression', object: { type: 'Identifier', name: 'el' }, property: { type: 'Identifier', name: 'setAttribute' } },
										arguments: [{ type: 'StringLiteral', value: normalizeAttrName(n) }, { type: 'StringLiteral', value: String(a.value.value) }],
									},
								})
								continue
							}
							// Ignore dynamic attrs for now in fallback.
						}

						const textExpr = childrenToTextExpr(el.children ?? [])
						const keyExpr = jsxAttrToKeyExpr(el.openingElement)

						return {
							type: 'ObjectExpression',
							properties: [
								...(keyExpr
									? [{ type: 'ObjectProperty', key: { type: 'Identifier', name: 'key' }, value: keyExpr, shorthand: false }]
									: []),
								{
									type: 'ObjectProperty',
									key: { type: 'Identifier', name: 'create' },
									value: {
										type: 'ArrowFunctionExpression',
										params: [],
										body: {
											type: 'BlockStatement',
											body: [
												{ type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator', id: { type: 'Identifier', name: 'el' }, init: { type: 'CallExpression', callee: { type: 'MemberExpression', object: { type: 'Identifier', name: 'document' }, property: { type: 'Identifier', name: 'createElement' } }, arguments: [{ type: 'StringLiteral', value: tag }] } }] },
												...setAttrsStmts,
												{
													type: 'ExpressionStatement',
													expression: {
														type: 'AssignmentExpression',
														operator: '=',
														left: { type: 'MemberExpression', object: { type: 'Identifier', name: 'el' }, property: { type: 'Identifier', name: 'textContent' } },
														right: textExpr,
													},
												},
												{ type: 'ReturnStatement', argument: { type: 'Identifier', name: 'el' } },
											],
										},
										expression: false,
									},
									shorthand: false,
								},
								{
									type: 'ObjectProperty',
									key: { type: 'Identifier', name: 'patch' },
									value: {
										type: 'ArrowFunctionExpression',
										params: [{ type: 'Identifier', name: 'node' }],
										body: {
											type: 'BlockStatement',
											body: [
												{ type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator', id: { type: 'Identifier', name: 'el' }, init: { type: 'Identifier', name: 'node' } }] },
												{
													type: 'ExpressionStatement',
													expression: {
														type: 'AssignmentExpression',
														operator: '=',
														left: { type: 'MemberExpression', object: { type: 'Identifier', name: 'el' }, property: { type: 'Identifier', name: 'textContent' } },
														right: textExpr,
													},
												},
											],
										},
										expression: false,
									},
									shorthand: false,
								},
							],
						}
					}

					// Build render function: () => ({ children: [specs...] })
					const rootSpec = elementToReconcileSpec(node)
					const renderFn = {
						type: 'ArrowFunctionExpression',
						params: [],
						body: {
							type: 'ObjectExpression',
							properties: [
								{
									type: 'ObjectProperty',
									key: { type: 'Identifier', name: 'children' },
									value: { type: 'ArrayExpression', elements: [rootSpec] },
									shorthand: false,
								},
							],
						},
						expression: true,
					}

					needsRuntimeImport = true
					needsFallbackImport = true
					path.replaceWith({
						type: 'ArrowFunctionExpression',
						params: [{ type: 'Identifier', name: 'host' }],
						body: {
							type: 'CallExpression',
							callee: { type: 'Identifier', name: 'mountFallback' },
							arguments: [{ type: 'Identifier', name: 'host' }, renderFn],
						},
					})
					return
				}

				needsRuntimeImport = true
				needsWrapper = true

				const blockConst = `__hrbr_block_${nextBlockId++}`
				path.findParent((p: any) => p.isProgram())?.unshiftContainer('body', {
					type: 'VariableDeclaration',
					kind: 'const',
					declarations: [
						{
							type: 'VariableDeclarator',
							id: { type: 'Identifier', name: blockConst },
							init: {
								type: 'CallExpression',
								callee: { type: 'Identifier', name: 'defineBlock' },
								arguments: [
									{
										type: 'ObjectExpression',
										properties: [
											{
												type: 'ObjectProperty',
												key: { type: 'Identifier', name: 'templateHTML' },
												value: { type: 'StringLiteral', value: built.templateHTML },
												shorthand: false,
											},
											{
												type: 'ObjectProperty',
												key: { type: 'Identifier', name: 'slots' },
												value: {
													type: 'ObjectExpression',
													properties: Object.entries(built.slots).map(([k, v]) => ({
														type: 'ObjectProperty',
														key: { type: 'StringLiteral', value: k },
														value: literalizeSlot(v),
														shorthand: false,
													})),
												},
												shorthand: false,
											},
										],
									},
								],
							},
						},
					],
				})

				path.replaceWith({
					type: 'ArrowFunctionExpression',
					params: [{ type: 'Identifier', name: 'host' }],
					body: {
						type: 'CallExpression',
						callee: { type: 'Identifier', name: mountWrapperName },
						arguments: [
							{ type: 'Identifier', name: 'host' },
							{ type: 'Identifier', name: blockConst },
							{ type: 'ArrayExpression', elements: built.compiledSlots },
						],
					},
				})
			},
			JSXFragment(path: any) {
				fail(path, 'JSX fragments <>...</> are not supported in block mode yet (route to fallback).')
			},
		},
	}
})

function literalizeSlot(slot: any): any {
	if (!slot || typeof slot !== 'object') return { type: 'NullLiteral' }
	const props: any[] = []
	props.push({ type: 'ObjectProperty', key: { type: 'Identifier', name: 'kind' }, value: { type: 'StringLiteral', value: slot.kind }, shorthand: false })
	props.push({
		type: 'ObjectProperty',
		key: { type: 'Identifier', name: 'path' },
		value: { type: 'ArrayExpression', elements: (slot.path ?? []).map((n: number) => ({ type: 'NumericLiteral', value: n })) },
		shorthand: false,
	})
	if (slot.name) {
		props.push({ type: 'ObjectProperty', key: { type: 'Identifier', name: 'name' }, value: { type: 'StringLiteral', value: slot.name }, shorthand: false })
	}
	if (slot.lane) {
		props.push({ type: 'ObjectProperty', key: { type: 'Identifier', name: 'lane' }, value: { type: 'StringLiteral', value: slot.lane }, shorthand: false })
	}
	return { type: 'ObjectExpression', properties: props }
}
