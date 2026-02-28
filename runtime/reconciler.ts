import { assert } from '../src/utils/assert'

export type Key = string | number

export type ReconcileRange = {
	kind: 'range'
	/** Optional key for keyed reconciliation */
	key?: Key
	/** Create the DOM nodes for this logical item (in order) */
	create(): Node[]
	/** Patch existing DOM nodes for this logical item (in order) */
	patch(nodes: Node[]): void
	/** Optional cleanup when this logical item is removed */
	destroy?(nodes: Node[]): void
}

export type ReconcileNode = {
	key?: Key
	/** Create a new DOM node for this logical node */
	create(): Node
	/** Patch an existing DOM node in-place */
	patch(node: Node): void
	/** Optional cleanup when a node is removed */
	destroy?(node: Node): void
}

export type ReconcileItem = ReconcileNode | ReconcileRange

export type ReconcileOptions = {
	keyed?: boolean
	/** When true, emit console warnings for suspicious usage patterns. */
	dev?: boolean
}

function devWarn(enabled: boolean, msg: string) {
	if (!enabled) return
	// eslint-disable-next-line no-console
	console.warn(msg)
}

function isRange(n: ReconcileItem): n is ReconcileRange {
	return (n as any).kind === 'range'
}

// Longest Increasing Subsequence on an array of numbers, ignoring -1.
// Returns indices into `arr` that form the LIS.
function lisIndices(arr: number[]) {
	const n = arr.length
	const prev = new Array<number>(n).fill(-1)
	const tails: number[] = [] // indices

	for (let i = 0; i < n; i++) {
		const v = arr[i]!
		if (v < 0) continue

		let lo = 0
		let hi = tails.length
		while (lo < hi) {
			const mid = (lo + hi) >> 1
			if (arr[tails[mid]!]! < v) lo = mid + 1
			else hi = mid
		}

		if (lo > 0) prev[i] = tails[lo - 1]!
		if (lo === tails.length) tails.push(i)
		else tails[lo] = i
	}

	// Reconstruct indices
	const out: number[] = []
	let k = tails.length > 0 ? tails[tails.length - 1]! : -1
	while (k !== -1) {
		out.push(k)
		k = prev[k]!
	}
	out.reverse()
	return out
}

function getNodeKey(n: ReconcileItem): Key | null {
	return (n as any).key ?? null
}

function getDomKey(node: Node): Key | null {
	return (node as any).__hrbrKey ?? null
}

function setDomKey(node: Node, key: Key | null) {
	if (key == null) {
		// Clearing is important when a node that previously started a keyed range
		// (or had a key) is reused as an unkeyed/singleton node.
		delete (node as any).__hrbrKey
		return
	}
	;(node as any).__hrbrKey = key
}

type RangeRecord = {
	key: Key | null
	start: Node
	end: Node
	nodes: Node[]
}

function setDomRangeLen(node: Node, len: number) {
	if (len <= 1) {
		delete (node as any).__hrbrRangeLen
		// Important: don't write `1` back. Missing means singleton.
		return
	}
	;(node as any).__hrbrRangeLen = len
}

function getDomRangeLen(node: Node): number {
	const v = (node as any).__hrbrRangeLen
	return typeof v === 'number' && v > 0 ? v : 1
}

function buildCurrentRanges(host: Node): RangeRecord[] {
	const out: RangeRecord[] = []
	const nodes = Array.from(host.childNodes)
	for (let i = 0; i < nodes.length; ) {
		const start = nodes[i]!
		const len = getDomRangeLen(start)
		const slice = nodes.slice(i, i + len)
		const end = slice[slice.length - 1]!
		out.push({ key: getDomKey(start), start, end, nodes: slice })
		i += len
	}
	return out
}

function insertNodesBefore(host: Node, nodes: Node[], anchor: ChildNode | null) {
	for (let i = 0; i < nodes.length; i++) host.insertBefore(nodes[i]!, anchor)
}

function moveRangeBefore(host: Node, range: RangeRecord, anchor: ChildNode | null) {
	// Move from end -> start to preserve order when inserting before the same anchor.
	for (let i = range.nodes.length - 1; i >= 0; i--) {
		host.insertBefore(range.nodes[i]!, anchor)
		anchor = range.nodes[i] as any
	}
}

/**
 * Patch `host.childNodes` so they match `next`.
 *
 * Contract:
 * - This reconciles *direct children* only.
 * - When keyed, keys must be unique among siblings.
 * - Nodes that remain are patched in place (no replacement) when possible.
 */
export function reconcileChildren(host: Node, next: ReconcileItem[], opts: ReconcileOptions = {}): void {
	const dev = opts.dev ?? false
	const hasSomeKeys = next.some((n) => (n as any).key != null)
	const hasSomeNoKeys = next.some((n) => (n as any).key == null)
	if (hasSomeKeys && hasSomeNoKeys) {
		devWarn(dev, '[hrbr/reconciler] mixed keyed and unkeyed children: unkeyed nodes will be treated as unstable and may be removed during keyed reconciliation')
	}
	const keyed = opts.keyed ?? hasSomeKeys
	if (!keyed) return reconcileChildrenUnkeyed(host, next)
	return reconcileChildrenKeyed(host, next, dev)
}

function reconcileChildrenUnkeyed(host: Node, next: ReconcileItem[]) {
	const current = buildCurrentRanges(host)
	const common = Math.min(current.length, next.length)

	for (let i = 0; i < common; i++) {
		const spec = next[i]!
		const range = current[i]!
		if (isRange(spec)) spec.patch(range.nodes)
		else spec.patch(range.start)
	}

	// remove extra
	for (let i = current.length - 1; i >= next.length; i--) {
		const range = current[i]!
		for (let j = range.nodes.length - 1; j >= 0; j--) host.removeChild(range.nodes[j]!)
	}

	// append missing
	for (let i = common; i < next.length; i++) {
		const spec = next[i]!
		if (isRange(spec)) {
			const created = spec.create()
			if (created.length > 0) {
				setDomKey(created[0]!, getNodeKey(spec))
				setDomRangeLen(created[0]!, created.length)
				insertNodesBefore(host, created, null)
			}
			continue
		}
		const created = spec.create()
		setDomKey(created, getNodeKey(spec))
		setDomRangeLen(created, 1)
		host.appendChild(created)
	}
}

function reconcileChildrenKeyed(host: Node, next: ReconcileItem[], dev: boolean) {
	function cleanupTrailingRangeNode(start: Node, key: Key) {
		// If `key` previously described a multi-node range, trailing nodes can remain
		// unkeyed in DOM. When this key is now rendered as a singleton, remove any
		// contiguous unkeyed siblings that immediately follow the start.
		let n = start.nextSibling
		while (n && getDomKey(n) == null) {
			const next = n.nextSibling
			if ((n as any).parentNode === host) host.removeChild(n)
			n = next
		}
	}

	const currentRanges = buildCurrentRanges(host)
	const currentNodesFlat = Array.from(host.childNodes)
	void currentNodesFlat

	// Map current keyed ranges by start key.
	const keyToRange = new Map<Key, RangeRecord>()
	for (const r of currentRanges) {
		if (r.key != null) keyToRange.set(r.key, r)
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

	// Unstable key detection: if the host already contains keyed children and `next` keys are disjoint,
	// the caller is likely generating unstable keys. This isn't always wrong (full replace), so we warn only.
	{
		const prevKeys = new Set<Key>()
		for (const r of currentRanges) {
			if (r.key != null) prevKeys.add(r.key)
		}
		if (prevKeys.size > 0) {
			let overlap = 0
			for (const n of next) {
				const k = getNodeKey(n)
				if (k != null && prevKeys.has(k)) overlap++
			}
			if (overlap === 0) {
				devWarn(
					dev,
					'[hrbr/reconciler] next children keys have no overlap with previous keyed children; if this is not a full replace, keys may be unstable (e.g. using array index)'
				)
			}
		}
	}

	// Build arrays of keys to do a two-ended scan.
	const oldKeys: Key[] = []
	for (let i = 0; i < currentRanges.length; i++) {
		const k = currentRanges[i]!.key
		if (k != null) oldKeys.push(k)
	}
	const newKeys: Key[] = []
	for (let i = 0; i < next.length; i++) {
		const k = getNodeKey(next[i]!)
		if (k != null) newKeys.push(k)
	}

	const usedStarts = new Set<Node>()

	// Fast two-ended scan for common prefix/suffix stability.
	let oldStart = 0
	let oldEnd = oldKeys.length - 1
	let newStart = 0
	let newEnd = newKeys.length - 1

	while (oldStart <= oldEnd && newStart <= newEnd) {
		const osk = oldKeys[oldStart]!
		const nsk = newKeys[newStart]!
		if (osk !== nsk) break
		const range = keyToRange.get(osk)!
		usedStarts.add(range.start)
		const spec = next.find((n) => getNodeKey(n as any) === osk)!
		if (isRange(spec)) {
			// If the DOM shape doesn't match (node<->range), stop the fast scan and
			// let the middle section handle it (it can safely recreate/remove).
			if (range.nodes.length <= 1) break
			spec.patch(range.nodes)
		} else {
			// If this key used to be a range, ensure we don't keep stale range metadata.
			const start: any = range.start
			delete start.__hrbrRangeLen
			spec.patch(range.start)
			cleanupTrailingRangeNode(range.start, osk)
		}
		oldStart++
		newStart++
	}

	while (oldStart <= oldEnd && newStart <= newEnd) {
		const oek = oldKeys[oldEnd]!
		const nek = newKeys[newEnd]!
		if (oek !== nek) break
		const range = keyToRange.get(oek)!
		usedStarts.add(range.start)
		const spec = next.find((n) => getNodeKey(n as any) === oek)!
		if (isRange(spec)) {
			if (range.nodes.length <= 1) break
			spec.patch(range.nodes)
		} else {
			const start: any = range.start
			delete start.__hrbrRangeLen
			spec.patch(range.start)
			cleanupTrailingRangeNode(range.start, oek)
		}
		oldEnd--
		newEnd--
	}

	// Middle section: LIS-based move minimization.
	// Build old-index sequence for new middle keys.
	const oldIndexByKey = new Map<Key, number>()
	for (let i = oldStart; i <= oldEnd; i++) {
		oldIndexByKey.set(oldKeys[i]!, i)
	}

	const middleLen = newEnd - newStart + 1
	const seq: number[] = new Array(middleLen)
	const existingRanges: Array<RangeRecord | null> = new Array(middleLen)

	for (let i = 0; i < middleLen; i++) {
		const key = newKeys[newStart + i]!
		const oldIndex = oldIndexByKey.get(key)
		if (oldIndex == null) {
			seq[i] = -1
			existingRanges[i] = null
			continue
		}
		seq[i] = oldIndex
		const range = keyToRange.get(key) ?? null
		existingRanges[i] = range
		if (range) {
			usedStarts.add(range.start)
			const spec = next[newStart + i]!
			const specIsRange = isRange(spec)
			const domIsRange = range.nodes.length > 1
			if (specIsRange !== domIsRange) {
				// Key matched but the logical shape changed (node <-> range).
				// Remove the old shape and treat as missing; we'll recreate below.
				for (let j = range.nodes.length - 1; j >= 0; j--) {
					const n = range.nodes[j]!
					if ((n as any).parentNode === host) host.removeChild(n)
				}
				existingRanges[i] = null
				if ((range.start as any).parentNode === host) usedStarts.delete(range.start)
				continue
			}
			if (specIsRange) (spec as ReconcileRange).patch(range.nodes)
			else {
				// Clear any stale range metadata. We avoid calling helpers here because
				// TS in this workspace is mis-reporting some call/assignment sites.
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					;(range.start as any).__hrbrRangeLen = null
				} catch {
					// ignore
				}
				(spec as ReconcileNode).patch(range.start)
				cleanupTrailingRangeNode(range.start, range.key ?? key)
			}
		}
	}

	const keep = new Set<number>(lisIndices(seq))

	// Anchor is the DOM node we insert before. Start from the right boundary.
	let anchor: ChildNode | null = null
	if (newEnd + 1 < next.length) {
		const boundaryKey = getNodeKey(next[newEnd + 1]!)
		if (boundaryKey != null) anchor = (keyToRange.get(boundaryKey)?.start as ChildNode | undefined) ?? null
	}

	// Walk backward so anchor is always correct.
	for (let i = middleLen - 1; i >= 0; i--) {
		const specIndex = newStart + i
		const spec = next[specIndex]!
		const k = getNodeKey(spec)
		if (k == null) {
			// Keyless specs are treated as unstable in keyed mode.
			// We still must materialize them to ensure the DOM matches `next`.
			if (isRange(spec)) {
				const created = spec.create()
				if (created.length > 0) {
					setDomKey(created[0]!, null)
					setDomRangeLen(created[0]!, created.length)
					insertNodesBefore(host, created, anchor)
					anchor = created[0] as any
				}
				continue
			}
			const created = spec.create()
			setDomKey(created, null)
			setDomRangeLen(created, 1)
			host.insertBefore(created, anchor)
			anchor = created as any
			continue
		}

		const existing = existingRanges[i]
		if (!existing) {
			if (isRange(spec)) {
				const created = spec.create()
				if (created.length > 0) {
					setDomKey(created[0]!, k)
					setDomRangeLen(created[0]!, created.length)
					insertNodesBefore(host, created, anchor)
					anchor = created[0] as any
				}
				continue
			}
			const created = spec.create()
			setDomKey(created, k)
			setDomRangeLen(created, 1)
			host.insertBefore(created, anchor)
			anchor = created as any
			continue
		}

		if (keep.has(i)) {
			// Even if the node is kept in place (part of LIS), we still need to
			// ensure it doesn't retain stale trailing nodes from a prior range shape.
			if (!isRange(spec) && existing.nodes.length <= 1) cleanupTrailingRangeNode(existing.start, k)
			anchor = existing.start as any
			continue
		}

		moveRangeBefore(host, existing, anchor)
		anchor = existing.start as any
	}

	// Ensure the prefix is in the right place (if it isn't already).
	// We don't try to be clever here; insertBefore is a no-op if already correct.
	let prefixAnchor: ChildNode | null = host.firstChild
	for (let i = 0; i < newStart; i++) {
		const k = getNodeKey(next[i]!)
		if (k == null) {
			const spec = next[i]!
			if (isRange(spec)) {
				const created = spec.create()
				if (created.length > 0) {
					setDomKey(created[0]!, null)
					setDomRangeLen(created[0]!, created.length)
					insertNodesBefore(host, created, prefixAnchor)
					prefixAnchor = created[created.length - 1]!.nextSibling
				}
				continue
			}
			const created = spec.create()
			setDomKey(created, null)
			setDomRangeLen(created, 1)
			host.insertBefore(created, prefixAnchor)
			prefixAnchor = created.nextSibling
			continue
		}
		const range = keyToRange.get(k) ?? null
		if (!range) continue
		moveRangeBefore(host, range, prefixAnchor)
		// If this keyed item is currently a singleton, ensure no stale range tail
		// nodes remain between it and the next keyed item.
		if (range.nodes.length <= 1) cleanupTrailingRangeNode(range.start, k)
		prefixAnchor = range.end.nextSibling
	}

	// Remove nodes not used. If a node has no key, keyed mode owns the list and removes it.
	for (const r of currentRanges) {
		if (r.key != null) {
			if (usedStarts.has(r.start)) continue
			const spec = next.find((n) => getNodeKey(n as any) === r.key) as ReconcileItem | undefined
			if (spec && isRange(spec) && spec.destroy) spec.destroy(r.nodes)
			if (spec && !isRange(spec) && (spec as ReconcileNode).destroy) (spec as ReconcileNode).destroy!(r.start)
			for (let j = r.nodes.length - 1; j >= 0; j--) host.removeChild(r.nodes[j]!)
			continue
		}
		// unkeyed range (owned by keyed mode)
		for (let j = r.nodes.length - 1; j >= 0; j--) {
			if ((r.nodes[j] as any).parentNode === host) host.removeChild(r.nodes[j]!)
		}
	}

	// Final normalization: in keyed mode, there must not be any unkeyed nodes
	// interleaved between keyed logical items. These most commonly arise as
	// stale trailing nodes from prior range shapes.
	{
		const nodes = Array.from(host.childNodes)
		for (let i = 0; i < nodes.length; ) {
			const start = nodes[i]!
			const startKey = getDomKey(start)
			if (startKey == null) {
				// Unkeyed nodes are owned by keyed mode; remove.
				if ((start as any).parentNode === host) host.removeChild(start)
				nodes.splice(i, 1)
				continue
			}
			const len = getDomRangeLen(start)
			// Remove any unkeyed nodes that immediately follow this logical item.
			let j = i + len
			while (j < nodes.length && getDomKey(nodes[j]!) == null) {
				const n = nodes[j]!
				if ((n as any).parentNode === host) host.removeChild(n)
				nodes.splice(j, 1)
			}
			i = j
		}
	}

	// Final pass: normalize any stale range metadata on keyed singleton nodes.
	// This is a safety net for node<->range shape changes that might have left
	// __hrbrRangeLen hanging around on a start node.
	for (const node of Array.from(host.childNodes)) {
		const k = getDomKey(node)
		if (k == null) continue
		const len = (node as any).__hrbrRangeLen
		if (typeof len === 'number' && len <= 1) {
			delete (node as any).__hrbrRangeLen
		}
	}
}
