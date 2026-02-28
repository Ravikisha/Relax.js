import { assert } from '../src/utils/assert'

export type Key = string | number

export type ReconcileNode = {
	key?: Key
	/** Create a new DOM node for this logical node */
	create(): Node
	/** Patch an existing DOM node in-place */
	patch(node: Node): void
	/** Optional cleanup when a node is removed */
	destroy?(node: Node): void
}

export type ReconcileOptions = {
	keyed?: boolean
}

function getNodeKey(n: ReconcileNode): Key | null {
	return n.key ?? null
}

function getDomKey(node: Node): Key | null {
	return (node as any).__hrbrKey ?? null
}

function setDomKey(node: Node, key: Key | null) {
	if (key == null) return
	;(node as any).__hrbrKey = key
}

/**
 * Patch `host.childNodes` so they match `next`.
 *
 * Contract:
 * - This reconciles *direct children* only.
 * - When keyed, keys must be unique among siblings.
 * - Nodes that remain are patched in place (no replacement) when possible.
 */
export function reconcileChildren(host: Node, next: ReconcileNode[], opts: ReconcileOptions = {}): void {
	const keyed = opts.keyed ?? next.some((n) => n.key != null)
	if (!keyed) return reconcileChildrenUnkeyed(host, next)
	return reconcileChildrenKeyed(host, next)
}

function reconcileChildrenUnkeyed(host: Node, next: ReconcileNode[]) {
	const current = Array.from(host.childNodes)
	const common = Math.min(current.length, next.length)

	for (let i = 0; i < common; i++) {
		next[i]!.patch(current[i]!)
	}

	// remove extra
	for (let i = current.length - 1; i >= next.length; i--) {
		const node = current[i]!
		host.removeChild(node)
	}

	// append missing
	for (let i = common; i < next.length; i++) {
		const created = next[i]!.create()
		setDomKey(created, getNodeKey(next[i]!))
		host.appendChild(created)
	}
}

function reconcileChildrenKeyed(host: Node, next: ReconcileNode[]) {
	const currentNodes = Array.from(host.childNodes)
	const keyToNode = new Map<Key, Node>()
	const used = new Set<Node>()

	for (const node of currentNodes) {
		const k = getDomKey(node)
		if (k != null) keyToNode.set(k, node)
	}

	// Validate uniqueness in `next`
	{
		const seen = new Set<Key>()
		for (const n of next) {
			const k = getNodeKey(n)
			if (k == null) continue
			assert(!seen.has(k), `[hrbr/reconciler] duplicate key '${String(k)}' in next children`)
			seen.add(k)
		}
	}

	let anchor: ChildNode | null = host.firstChild

	for (let i = 0; i < next.length; i++) {
		const spec = next[i]!
		const k = getNodeKey(spec)

		let node: Node | null = null
		if (k != null) node = keyToNode.get(k) ?? null

		if (node) {
			used.add(node)
			spec.patch(node)

			// Move into correct position if needed.
			if (node !== anchor) {
				host.insertBefore(node, anchor)
			}

			anchor = node.nextSibling
			continue
		}

		// Create new node
		const created = spec.create()
		setDomKey(created, k)
		if (anchor) host.insertBefore(created, anchor)
		else host.appendChild(created)
		anchor = created.nextSibling
	}

	// Remove nodes not used.
	for (const node of currentNodes) {
		if (used.has(node)) continue

		// If node had a key, it wasn't in next. If node had no key, we also remove it,
		// because keyed mode assumes full control of the children list.
		host.removeChild(node)
	}
}
