import { removeAttribute, removeStyle, setAttribute, setStyle } from './attributes'
import { destroyDOM } from './destroy-dom'
import { addEventListener, updateEventListener } from './events'
import { DOM_TYPES, extractChildren, isComponent, type HrbrVNode } from './h'
import { mountDOM } from './mount-dom'
import { areNodesEqual } from './nodes-equal'
import { arraysDiff, arraysDiffSequence, ARRAY_DIFF_OP } from './utils/arrays'
import { objectsDiff } from './utils/objects'
import { extractPropsAndEvents } from './utils/props'
import { isNotBlankOrEmptyString } from './utils/strings'
import { reconcileChildren, type ReconcileNode } from '../runtime/reconciler'
import { measurePatchPhase } from '../runtime/devtools'

export function patchDOM(oldVdom: any, newVdom: any, parentEl: any, hostComponent: any = null) {
    if (!areNodesEqual(oldVdom, newVdom)) {
    // Fast path: DOM provides a constant-time index when available.
    // This avoids `Array.from(parentEl.childNodes).indexOf(...)` allocations.
    const index = getChildNodeIndex(parentEl, oldVdom.el)
        destroyDOM(oldVdom)
        mountDOM(newVdom, parentEl, index, hostComponent)

        return newVdom
    }

    newVdom.el = oldVdom.el

    switch (newVdom.type) {
        case DOM_TYPES.TEXT: {
            patchText(oldVdom, newVdom)
            return newVdom
        }

        case DOM_TYPES.ELEMENT: {
            patchElement(oldVdom, newVdom, hostComponent)
            break
        }

        case DOM_TYPES.COMPONENT: {
            patchComponent(oldVdom, newVdom)
            break
        }

        case DOM_TYPES.HRBR: {
            patchHrbr(oldVdom as HrbrVNode, newVdom as HrbrVNode)
            return newVdom
        }
    }

    patchChildren(oldVdom, newVdom, hostComponent)

    return newVdom
}

function patchDOMSameElement(oldVdom: any, newVdom: any, hostComponent: any = null) {
    // Like patchDOM, but skips the replace path (no parentEl/index scan).
    newVdom.el = oldVdom.el

    switch (newVdom.type) {
        case DOM_TYPES.TEXT: {
            patchText(oldVdom, newVdom)
            return newVdom
        }

        case DOM_TYPES.ELEMENT: {
            patchElement(oldVdom, newVdom, hostComponent)
            break
        }

        case DOM_TYPES.COMPONENT: {
            patchComponent(oldVdom, newVdom)
            break
        }

        case DOM_TYPES.HRBR: {
            patchHrbr(oldVdom as HrbrVNode, newVdom as HrbrVNode)
            return newVdom
        }
    }

    patchChildren(oldVdom, newVdom, hostComponent)
    return newVdom
}

function patchHrbr(oldVdom: HrbrVNode, newVdom: HrbrVNode) {
    // Keep the existing mounted instance when the mount factory is referentially stable.
    // This matches how we'd treat a Component function identity.
    if (oldVdom.mount === newVdom.mount) {
    if (oldVdom.host) newVdom.host = oldVdom.host
    if (oldVdom.instance) newVdom.instance = oldVdom.instance
    if (oldVdom.el) newVdom.el = oldVdom.el
        return
    }

    // Otherwise, dispose+destroy the old instance and remount into the same host.
    // The replace path is handled in patchDOM when areNodesEqual() fails; this is the "same type" case.
    const host = oldVdom.host
    if (!host) {
        // If somehow missing, just treat as a no-op.
        return
    }
    const inst = oldVdom.instance
    if (inst?.dispose) inst.dispose()
    if (inst?.destroy) inst.destroy()
    while (host.firstChild) host.removeChild(host.firstChild)
    const nextInst = newVdom.mount(host)
    newVdom.host = host
    newVdom.instance = nextInst
    newVdom.el = host.firstElementChild ?? host
}

function getVdomKey(vdom: any): any {
    return vdom?.props?.key
}

function areAllChildrenKeyed(children: any[]) {
    for (let i = 0; i < children.length; i++) {
        if (getVdomKey(children[i]) == null) {
            return false
        }
    }
    return true
}

// Longest Increasing Subsequence on an array of numbers, ignoring -1.
// Returns indices into `arr` that form the LIS.
function lisIndices(arr: number[]) {
    const n = arr.length
    const prev = new Array<number>(n)
    const tails: number[] = []
    const tailsIdx: number[] = []

    for (let i = 0; i < n; i++) {
        const v = arr[i]!
        if (v < 0) {
            prev[i] = -1
            continue
        }

        let lo = 0
        let hi = tails.length
        while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (tails[mid]! < v) lo = mid + 1
            else hi = mid
        }

        if (lo > 0) {
            prev[i] = tailsIdx[lo - 1]!
        } else {
            prev[i] = -1
        }

        if (lo === tails.length) {
            tails.push(v)
            tailsIdx.push(i)
        } else {
            tails[lo] = v
            tailsIdx[lo] = i
        }
    }

    if (tailsIdx.length === 0) {
        return []
    }

    let k = tailsIdx[tailsIdx.length - 1]!
    const out: number[] = []
    while (k >= 0) {
        out.push(k)
        k = prev[k]!
    }
    out.reverse()
    return out
}

function patchKeyedChildrenReorder(
    oldChildren: any[],
    newChildren: any[],
    parentEl: any,
    hostComponent: any
) {
    // If not keyed, bail.
    if (oldChildren.length === 0 && newChildren.length === 0) {
        return true
    }
    if (!areAllChildrenKeyed(oldChildren) || !areAllChildrenKeyed(newChildren)) {
        return false
    }

    const offset = hostComponent?.offset ?? 0

    const oldKeyToIndex = new Map<any, number>()
    for (let i = 0; i < oldChildren.length; i++) {
        oldKeyToIndex.set(getVdomKey(oldChildren[i]), i)
    }

    // 1) Remove old nodes not in new.
    const newKeySet = new Set<any>()
    for (let i = 0; i < newChildren.length; i++) {
        newKeySet.add(getVdomKey(newChildren[i]))
    }
    for (let i = 0; i < oldChildren.length; i++) {
        const oldKey = getVdomKey(oldChildren[i])
        if (!newKeySet.has(oldKey)) {
            destroyDOM(oldChildren[i])
        }
    }

    // 2) Patch existing + mount new, and build old-index sequence for LIS.
    const seq: number[] = new Array(newChildren.length)
    for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i]
        const oldIndex = oldKeyToIndex.get(getVdomKey(newChild))
        if (oldIndex == null) {
            seq[i] = -1
        } else {
            seq[i] = oldIndex
            newChildren[i] = patchDOMSameElement(oldChildren[oldIndex], newChild, hostComponent)
        }
    }

    // 3) Move only items not in LIS, in a single backward pass.
    const lis = lisIndices(seq)
    const keep = new Set<number>(lis)

    const elementsForChild = (child: any): Element[] => {
        if (!child) return []
        return isComponent(child as any)
            ? ((child as any).component?.elements ?? [])
            : [(child as any).el]
    }

    const firstElForChild = (child: any): Element | null => {
        const els = elementsForChild(child)
        return els.length > 0 ? els[0]! : null
    }

    // Build a stable anchor list from the desired NEW order.
    // For existing children, we can use their current DOM element as anchor (it will be moved later if needed).
    // For new mounts, anchor will be null until mounted.
    const anchors: Array<Element | null> = new Array(newChildren.length)
    for (let i = 0; i < newChildren.length; i++) {
        const oldIndex = seq[i]
        anchors[i] = oldIndex === -1 ? null : firstElForChild(oldChildren[oldIndex as number])
    }

    // Move/mount from the end so anchors to the right are already in correct relative position.
    // Optimization: keep track of the next stable anchor to the right so we don't scan O(n^2).
    let nextAnchor: Element | null = null
    for (let i = newChildren.length - 1; i >= 0; i--) {
        const oldIndex = seq[i]
        const newChild = newChildren[i]

        const anchor = nextAnchor

        if (oldIndex === -1) {
            // mount, then move before anchor
            mountDOM(newChild, parentEl, null as any, hostComponent)
            const els = elementsForChild(newChild)
            // If the newly mounted first node is already at `anchor`, don't churn it.
            if (els.length > 0 && els[0] === anchor) {
                // noop
            } else {
                for (let k = 0; k < els.length; k++) {
                    parentEl.insertBefore(els[k]!, anchor)
                }
            }
            anchors[i] = firstElForChild(newChild)
        } else if (keep.has(i)) {
            // Still need to ensure anchor points at the current first element.
            anchors[i] = firstElForChild(oldChildren[oldIndex as number])
        } else {
            const oldChild = oldChildren[oldIndex as number]
            const els = elementsForChild(oldChild)
            // If this range already starts at the desired anchor, the whole range is already in place.
            if (els.length > 0 && els[0] === anchor) {
                // noop
            } else {
                for (let k = 0; k < els.length; k++) {
                    parentEl.insertBefore(els[k]!, anchor)
                }
            }
            anchors[i] = firstElForChild(oldChild)
        }

        // Update nextAnchor for the next iteration (to the left).
        // Prefer the element in the desired NEW order (after any mounts/moves).
        const ai = anchors[i] ?? null
        if (ai) {
            nextAnchor = ai
        }
    }

    return true
}

function isStableKeyedSameOrder(oldChildren: any[], newChildren: any[]) {
    if (oldChildren.length !== newChildren.length) {
        return false
    }

    if (oldChildren.length === 0) {
        return true
    }

    // Only consider this optimization when both sides look keyed.
    for (let i = 0; i < oldChildren.length; i++) {
        const oldKey = getVdomKey(oldChildren[i])
        const newKey = getVdomKey(newChildren[i])

        if (oldKey == null || newKey == null) {
            return false
        }
        if (oldKey !== newKey) {
            return false
        }
    }

    return true
}

function getChildNodeIndex(parentEl: Element, el: any) {
    if (!parentEl || !el) return null

    // Walk siblings (no allocations).
    let i = 0
    let cur: ChildNode | null = parentEl.firstChild
    while (cur) {
        if (cur === el) return i
        cur = cur.nextSibling
        i++
    }
    return null
}

function patchText(oldVdom: any, newVdom: any) {
    const el = oldVdom.el as Text
    const { value: oldText } = oldVdom
    const { value: newText } = newVdom

    if (oldText !== newText) {
        el.nodeValue = newText
    }
}

function patchElement(oldVdom: any, newVdom: any, hostComponent: any) {
    const el = oldVdom.el as HTMLElement
    const { class: oldClass, style: oldStyle, on: oldEvents, ...oldAttrs } = oldVdom.props
    const { class: newClass, style: newStyle, on: newEvents, ...newAttrs } = newVdom.props
    const { listeners: oldListeners } = oldVdom

    // Fast paths: in big lists many nodes keep the same props object (or stable sub-objects).
    if (oldAttrs !== newAttrs) {
        measurePatchPhase('vdom:attrs', () => patchAttrs(el, oldAttrs, newAttrs))
    }
    if (oldClass !== newClass) {
        measurePatchPhase('vdom:class', () => patchClasses(el, oldClass, newClass))
    }
    if (oldStyle !== newStyle) {
        measurePatchPhase('vdom:style', () => patchStyles(el, oldStyle, newStyle))
    }
    if (oldEvents !== newEvents || oldListeners == null) {
        newVdom.listeners = measurePatchPhase('vdom:events', () =>
            patchEvents(el, oldListeners, oldEvents, newEvents, hostComponent)
        )
    } else {
        newVdom.listeners = oldListeners
    }
}

function patchAttrs(el: Element, oldAttrs: Record<string, any>, newAttrs: Record<string, any>) {
    const { added, removed, updated } = objectsDiff(oldAttrs, newAttrs)

    for (const attr of removed) {
        removeAttribute(el, attr)
    }

    for (let i = 0; i < added.length; i++) {
        const attr = added[i]!
        setAttribute(el, attr, newAttrs[attr])
    }
    for (let i = 0; i < updated.length; i++) {
        const attr = updated[i]!
        setAttribute(el, attr, newAttrs[attr])
    }
}

function patchClasses(el: Element, oldClass?: string[] | string, newClass?: string[] | string) {
    // Common case for benchmarks: class is unchanged or absent.
    if (oldClass === newClass) return

    const oldClasses = toClassList(oldClass)
    const newClasses = toClassList(newClass)

    // Avoid arraysDiff() here: it uses findIndex/splice and becomes O(n^2) for many classes.
    // A Set-based diff is O(n) and allocates predictably.
    const oldSet = new Set<string>(oldClasses)
    const newSet = new Set<string>(newClasses)

    const removed: string[] = []
    for (const c of oldSet) {
        if (!newSet.has(c)) removed.push(c)
    }

    const added: string[] = []
    for (const c of newSet) {
        if (!oldSet.has(c)) added.push(c)
    }

    if (removed.length > 0) {
        ;(el as HTMLElement).classList.remove(...removed)
    }
    if (added.length > 0) {
        ;(el as HTMLElement).classList.add(...added)
    }
}

function toClassList(classes: string[] | string = '') {
    return Array.isArray(classes)
        ? classes.filter(isNotBlankOrEmptyString)
        : classes.split(' ').filter(isNotBlankOrEmptyString)
}

function patchStyles(el: HTMLElement, oldStyle: Record<string, any> = {}, newStyle: Record<string, any> = {}) {
    const { added, removed, updated } = objectsDiff(oldStyle, newStyle)

    for (const style of removed) {
        removeStyle(el, style)
    }

    for (let i = 0; i < added.length; i++) {
        const style = added[i]!
        setStyle(el, style, newStyle[style])
    }
    for (let i = 0; i < updated.length; i++) {
        const style = updated[i]!
        setStyle(el, style, newStyle[style])
    }
}

function patchEvents(
    el: Element,
    oldListeners: Record<string, EventListener> = {},
    oldEvents: Record<string, any> = {},
    newEvents: Record<string, any> = {},
    hostComponent: any
) {
    const { removed, added, updated } = objectsDiff(oldEvents, newEvents)

    for (let i = 0; i < removed.length; i++) {
        const eventName = removed[i]!
        const listener = oldListeners[eventName]
        if (listener) el.removeEventListener(eventName, listener)
    }
    for (let i = 0; i < updated.length; i++) {
        const eventName = updated[i]!
        const listener = oldListeners[eventName]
        if (listener) {
            // No DOM churn: update stable wrapper in place.
            updateEventListener(listener, newEvents[eventName], hostComponent)
        }
    }

    // Preserve existing listeners map whenever possible.
    // Note: for updated events we keep the old listener reference.
    const addedListeners: Record<string, EventListener> = {}
    for (let i = 0; i < added.length; i++) {
        const eventName = added[i]!
        const listener = addEventListener(eventName, newEvents[eventName], el, hostComponent)
        addedListeners[eventName] = listener
    }

    for (let i = 0; i < updated.length; i++) {
        const eventName = updated[i]!
        const listener = oldListeners[eventName]
        if (listener) {
            addedListeners[eventName] = listener
        } else {
            // Safety fallback: if missing, mount a new listener.
            addedListeners[eventName] = addEventListener(eventName, newEvents[eventName], el, hostComponent)
        }
    }

    return addedListeners
}

function patchComponent(oldVdom: any, newVdom: any) {
    const { component } = oldVdom
    const { children } = newVdom
    const { props } = extractPropsAndEvents(newVdom)

    component.setExternalContent(children)
    component.updateProps(props)

    newVdom.component = component
    newVdom.el = component.firstElement
}

function patchChildren(oldVdom: any, newVdom: any, hostComponent: any) {
    const oldChildren = extractChildren(oldVdom)
    const newChildren = extractChildren(newVdom)
    const parentEl = oldVdom.el

    // Count this as part of diff time: extracting children is part of the VDOM traversal overhead.

    // Optional fast path: delegate large keyed child lists to the HRBR reconciler.
    // This is opt-in via `_reconcile: 'hrbr'` and only applies when all direct children are keyed.
    // Motivation: large keyed lists where rows update in-place (10k/1%) can be dominated by VDOM diff traversal.
    // The reconciler patches/moves DOM nodes with a single keyed pass.
    if (newVdom?.props?._reconcile === 'hrbr') {
        if (areAllChildrenKeyed(oldChildren as any[]) && areAllChildrenKeyed(newChildren as any[])) {
            const oldByKey = new Map<any, any>()
            for (let i = 0; i < (oldChildren as any[]).length; i++) {
                oldByKey.set(getVdomKey((oldChildren as any[])[i]), (oldChildren as any[])[i])
            }

            const nextSpecs: ReconcileNode[] = new Array(newChildren.length)
            for (let i = 0; i < newChildren.length; i++) {
                const child: any = newChildren[i]
                const key = getVdomKey(child)
                const oldChild = oldByKey.get(key) ?? null

                nextSpecs[i] = {
                    key: key as any,
                    create() {
                        mountDOM(child as any, parentEl, null as any, hostComponent)
                        return isComponent(child as any)
                            ? (((child as any).component?.firstElement ?? (child as any).el) as any)
                            : ((child as any).el as any)
                    },
                    patch(node: Node) {
                        if (oldChild) {
                            patchDOMSameElement(oldChild as any, child as any, hostComponent)
                        } else {
                            // Shouldn't happen in keyed mode, but if it does we mount in-place.
                            mountDOM(child as any, parentEl, null as any, hostComponent)
                        }
                        ;(child as any).el = node as any
                    },
                    destroy(node: Node) {
                        if (oldChild) destroyDOM(oldChild as any)
                        else if (node.parentNode) node.parentNode.removeChild(node)
                    },
                } satisfies ReconcileNode
            }

            reconcileChildren(parentEl as any, nextSpecs, { keyed: true })
            return
        }
    }

    // Heuristic: for large fully-keyed lists, prefer keyed reorder early.
    // Motivation: the general arraysDiffSequence() path does a lot of scanning/splicing work.
    // This heuristic is behavior-preserving because patchKeyedChildrenReorder() already encodes
    // insert/remove/move semantics for fully-keyed siblings.
    const LARGE_KEYED_LIST = 64
    if (
        oldChildren.length >= LARGE_KEYED_LIST &&
        newChildren.length >= LARGE_KEYED_LIST &&
        areAllChildrenKeyed(oldChildren as any[]) &&
        areAllChildrenKeyed(newChildren as any[])
    ) {
        if (
            measurePatchPhase('vdom:moves', () =>
                patchKeyedChildrenReorder(oldChildren as any[], newChildren as any[], parentEl, hostComponent)
            )
        ) {
            return
        }
    }

    // Row fast path (opt-in): when a node is marked as having a single text child,
    // patch the text node only. Useful for large lists like <li>{label}</li>.
    if (oldVdom?.props?._textOnly === true && newVdom?.props?._textOnly === true) {
        if (oldChildren.length === 1 && newChildren.length === 1) {
            if (oldChildren[0]?.type === DOM_TYPES.TEXT && newChildren[0]?.type === DOM_TYPES.TEXT) {
                newChildren[0] = patchDOMSameElement(oldChildren[0], newChildren[0], hostComponent)
                return
            }
        }
    }

    // Keyed reorder fast path: key→index + LIS (fewest DOM moves)
    if (
        measurePatchPhase('vdom:moves', () =>
            patchKeyedChildrenReorder(oldChildren as any[], newChildren as any[], parentEl, hostComponent)
        )
    ) {
        return
    }

    // Fast path: keyed children with stable order (same keys at same indices).
    // This avoids the O(n^2) diff for the common case where a list is updated in-place.
    if (isStableKeyedSameOrder(oldChildren as any[], newChildren as any[])) {
        for (let index = 0; index < newChildren.length; index++) {
            // Keep `.el` pointers correct by writing patched vdom back.
            newChildren[index] = patchDOMSameElement(oldChildren[index], newChildren[index], hostComponent)
        }
        return
    }

    const diffSeq = measurePatchPhase('vdom:diff', () => arraysDiffSequence(oldChildren, newChildren, areNodesEqual))
    const offset = hostComponent?.offset ?? 0
    for (const operation of diffSeq) {
    const { originalIndex, index, item } = operation as any

        switch ((operation as any).op) {
            case ARRAY_DIFF_OP.ADD: {
                mountDOM(item, parentEl, index + offset, hostComponent)
                break
            }

            case ARRAY_DIFF_OP.REMOVE: {
        // `item` is the old child to remove.
        destroyDOM(item)
                break
            }

            case ARRAY_DIFF_OP.MOVE: {
        const oldChild = item ?? oldChildren[originalIndex]
        const newChild = newChildren[index]
                const elAtTargetIndex = parentEl.childNodes[index + offset]

                measurePatchPhase('vdom:moves', () => {
                    const elementsToMove = isComponent(oldChild as any)
                        ? (oldChild as any).component.elements
                        : [(oldChild as any).el]
                    for (let i = 0; i < elementsToMove.length; i++) {
                        parentEl.insertBefore(elementsToMove[i]!, elAtTargetIndex)
                    }
                })
                // Patch once per moved vnode, not once per moved element.
                patchDOM(oldChild as any, newChild as any, parentEl, hostComponent)
                break
            }

            case ARRAY_DIFF_OP.NOOP: {
                const oldChild = item ?? oldChildren[originalIndex]
                patchDOM(oldChild as any, newChildren[index] as any, parentEl, hostComponent)
                break
            }
        }
    }
}
