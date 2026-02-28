import { assert } from '../src/utils/assert'
import { batch, createEffect } from './signals'
import { createScheduler, type Lane } from './scheduler'
import { emitDevtoolsEvent, emitDomOp } from './devtools'

export type BlockSlotKind = 'text' | 'attr' | 'prop' | 'class' | 'style' | 'event'

export type TextSlot = {
  kind: 'text'
  /** Path from the template root to a Text node */
  path: number[]
}

export type AttrSlot = {
  kind: 'attr'
  /** Path from the template root to an Element */
  path: number[]
  name: string
}

export type PropSlot = {
  kind: 'prop'
  /** Path from the template root to an Element */
  path: number[]
  name: string
}

export type ClassSlot = {
  kind: 'class'
  /** Path from the template root to an Element */
  path: number[]
}

export type StyleSlot = {
  kind: 'style'
  /** Path from the template root to an Element */
  path: number[]
}

export type EventSlot = {
  kind: 'event'
  /** Path from the template root to an Element */
  path: number[]
  /** DOM event name, e.g. 'click' */
  name: string
}

export type BlockSlot = TextSlot | AttrSlot | PropSlot | ClassSlot | StyleSlot | EventSlot

export type BlockDef = {
  templateHTML: string
  slots: Record<string, BlockSlot>
}

export type CompiledSlot = {
  key: string
  read: () => unknown
}

export type MountCompiledBlockOptions = {
  lane?: Lane
  scheduler?: ReturnType<typeof createScheduler>
}

export type MountBlockOptions = {
  /**
   * When true, include the slot key in path resolution assertions for easier debugging.
   * Defaults to false.
   */
  dev?: boolean

  /**
   * Optional binding target for event slots.
   * When set, event handlers are invoked with `this === hostComponent`, matching Relax VDOM semantics.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent?: any
}

export type MountedBlock = {
  host: Element
  root: Element
  slotNodes: Record<string, Node>
  update(values: Record<string, unknown>): void
  /** Dispose reactive resources (if any) and remove DOM. Safe to call multiple times. */
  dispose(): void
  destroy(): void
}

export type MountedChild = {
  destroy(): void
}

function valuesEqual(a: unknown, b: unknown): boolean {
  // Cheap equality check used to skip unnecessary DOM writes.
  // For objects (e.g. style/class arrays), this only skips when reference-equal.
  return Object.is(a, b)
}

function isSvgElement(el: Element): boolean {
  // SVGElement may not exist in all runtimes, so we use namespaceURI.
  return el.namespaceURI === 'http://www.w3.org/2000/svg'
}

function setMaybeNamespacedAttribute(el: Element, name: string, value: string) {
  // Minimal SVG correctness: use xlink namespace for xlink:* attrs if present.
  if (isSvgElement(el) && name.startsWith('xlink:')) {
    el.setAttributeNS('http://www.w3.org/1999/xlink', name, value)
  } else {
    el.setAttribute(name, value)
  }
}

function removeMaybeNamespacedAttribute(el: Element, name: string) {
  if (isSvgElement(el) && name.startsWith('xlink:')) {
  el.removeAttributeNS('http://www.w3.org/1999/xlink', name.slice('xlink:'.length))
  } else {
    el.removeAttribute(name)
  }
}

function isBooleanishAttribute(name: string): boolean {
  // A small safe subset; can be expanded later.
  return (
    name === 'disabled' ||
    name === 'checked' ||
    name === 'selected' ||
    name === 'readonly' ||
    name === 'readOnly' ||
    name === 'multiple' ||
    name === 'hidden' ||
    name === 'required'
  )
}

function normalizeBooleanAttrName(name: string): string {
  // HTML attributes are case-insensitive but DOM uses lowercase.
  if (name === 'readOnly') return 'readonly'
  return name.toLowerCase()
}

function setAttr(el: Element, name: string, next: unknown) {
  if (next == null || next === false) {
  emitDomOp('removeAttribute')
    removeMaybeNamespacedAttribute(el, normalizeBooleanAttrName(name))
    return
  }

  if (isBooleanishAttribute(name)) {
    // Boolean attributes are present/absent.
    emitDomOp('setAttribute')
    setMaybeNamespacedAttribute(el, normalizeBooleanAttrName(name), '')
    return
  }

  emitDomOp('setAttribute')
  setMaybeNamespacedAttribute(el, name, String(next))
}

function setProp(el: any, name: string, next: unknown) {
  // Input correctness: value/checked should map to properties.
  if (name === 'value') {
    emitDomOp('setProperty')
    el.value = next == null ? '' : String(next)
    return
  }
  if (name === 'checked') {
    emitDomOp('setProperty')
    el.checked = Boolean(next)
    return
  }
  emitDomOp('setProperty')
  el[name] = next
}

type ListenerRecord = {
  type: string
  handler: EventListener
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  current?: any
}

function parseTemplate(templateHTML: string): Element {
  const tpl = document.createElement('template')
  tpl.innerHTML = templateHTML.trim()

  const root = tpl.content.firstElementChild
  assert(root != null, '[hrbr/block] templateHTML must have a single root element')

  return root as Element
}

export function defineBlock(def: BlockDef): BlockDef {
  return def
}

export function mountBlock(
  def: BlockDef,
  host: Element,
  initialValues: Record<string, unknown> = {},
  options: MountBlockOptions = {}
): MountedBlock {
  const root = parseTemplate(def.templateHTML)
  const instanceRoot = root.cloneNode(true) as Element

  host.appendChild(instanceRoot)

  const slotNodes: Record<string, Node> = Object.create(null)

  for (const [name, slot] of Object.entries(def.slots)) {
  const node = resolvePathCached(instanceRoot, slot.path, name, options.dev)
    slotNodes[name] = node
  }

  const listenersByKey: Record<string, ListenerRecord | undefined> = Object.create(null)

  // Track the last applied value per slot so we can skip redundant writes.
  const prevValues: Record<string, unknown> = Object.create(null)
  const mountedChildren: MountedChild[] = []
  let destroyed = false

  function trackChild(child: MountedChild) {
    mountedChildren.push(child)
    return child
  }

  const block: MountedBlock = {
    host,
    root: instanceRoot,
    slotNodes,
    update(values) {
  if (destroyed) return
      for (const [key, next] of Object.entries(values)) {
        const slot = def.slots[key]
        if (!slot) continue

      // Event slots: handle equality-by-reference against the previous handler.
      // If unchanged, don't touch listeners.
      if (slot.kind === 'event') {
        if (key in prevValues && valuesEqual(prevValues[key], next)) continue
        prevValues[key] = next
      } else {
        // Other slots: simple equality skips DOM writes.
        if (key in prevValues && valuesEqual(prevValues[key], next)) continue
        prevValues[key] = next
      }

        const node = slotNodes[key]
        if (!node) continue

  emitDevtoolsEvent({ type: 'slotWrite', slotKind: slot.kind, slotKey: key })

        switch (slot.kind) {
          case 'text': {
            assert(node.nodeType === Node.TEXT_NODE, `[hrbr/block] slot '${key}' expected a Text node`)
            emitDomOp('setText')
            ;(node as Text).nodeValue = next == null ? '' : String(next)
            break
          }

          case 'attr': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as Element
            setAttr(el, slot.name, next)
            break
          }

          case 'prop': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as any
            setProp(el, slot.name, next)
            break
          }

          case 'class': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as Element
            if (next == null || next === false) {
              emitDomOp('removeAttribute')
              el.removeAttribute('class')
            } else if (Array.isArray(next)) {
              emitDomOp('setAttribute')
              el.setAttribute('class', next.filter(Boolean).join(' '))
            } else {
              emitDomOp('setAttribute')
              el.setAttribute('class', String(next))
            }
            break
          }

          case 'style': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as HTMLElement
            const style = next as any
            if (style == null || style === false) {
        emitDomOp('removeAttribute')
              el.removeAttribute('style')
            } else if (typeof style === 'string') {
        emitDomOp('setAttribute')
              el.setAttribute('style', style)
            } else if (typeof style === 'object') {
              for (const [k, v] of Object.entries(style)) {
                if (v == null) {
          emitDomOp('styleRemoveProperty')
                  el.style.removeProperty(k)
                } else {
          emitDomOp('styleSetProperty')
                  el.style.setProperty(k, String(v))
                }
              }
            } else {
        emitDomOp('setAttribute')
              el.setAttribute('style', String(style))
            }
            break
          }

          case 'event': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as Element

            const prev = listenersByKey[key]

            // If the event type changed (shouldn't normally happen), remove the old listener.
            if (prev && prev.type !== slot.name) {
              emitDomOp('removeEventListener')
              el.removeEventListener(prev.type, prev.handler)
              listenersByKey[key] = undefined
            }

            // Lazily bind once per slot and only update the current handler reference.
            if (!listenersByKey[key]) {
              const rec: ListenerRecord = {
                type: slot.name,
                handler: (ev) => {
                  const cur = rec.current
                  if (typeof cur !== 'function') return
                  if (options.hostComponent) {
                    cur.call(options.hostComponent, ev)
                  } else {
                    cur(ev)
                  }
                },
                current: next,
              }
              emitDomOp('addEventListener')
              el.addEventListener(slot.name, rec.handler)
              listenersByKey[key] = rec
            } else {
              // Update the handler reference (no re-bind).
              listenersByKey[key]!.current = next
            }
            break
          }
        }
      }
    },
    dispose() {
      // mountBlock itself is not reactive, so dispose == destroy.
      block.destroy()
    },
    destroy() {
      if (destroyed) return
      destroyed = true

      // 1) Destroy composed children first (nested blocks/fallback regions).
      for (const child of mountedChildren.splice(0)) {
        child.destroy()
      }

      // 2) Remove event listeners.
      for (const [key, rec] of Object.entries(listenersByKey)) {
        if (!rec) continue
        const slot = def.slots[key]
        if (!slot || slot.kind !== 'event') continue
        const node = slotNodes[key]
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          ;(node as Element).removeEventListener(rec.type, rec.handler)
        }
      }

      // 3) Remove DOM.
      instanceRoot.remove()
    },
  }

  block.update(initialValues)

  // expose internal child tracking for composition helpers
  ;(block as any).__hrbrTrackChild = trackChild

  return block
}

function getSlotElement(block: MountedBlock, slotKey: string): Element {
  const node = block.slotNodes[slotKey]
  assert(node != null, `[hrbr/block] unknown slot '${slotKey}'`)
  assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${slotKey}' expected an Element node`)
  return node as Element
}

/**
 * Mount a nested block into an Element slot of a parent block.
 * The nested block is automatically destroyed when the parent is destroyed.
 */
export function mountNestedBlock(parent: MountedBlock, slotKey: string, def: BlockDef, initialValues: Record<string, unknown> = {}) {
  const host = getSlotElement(parent, slotKey)

  // Clear existing children to make the slot act like a "mount point".
  while (host.firstChild) host.removeChild(host.firstChild)

  const child = mountBlock(def, host, initialValues)
  const track: ((c: MountedChild) => MountedChild) | undefined = (parent as any).__hrbrTrackChild
  if (track) track(child)
  return child
}

/**
 * Mount a fallback region into an Element slot of a parent block.
 * The region is automatically disposed/destroyed when the parent is destroyed.
 */
export function mountNestedFallback(
  parent: MountedBlock,
  slotKey: string,
  mount: (host: Element) => { destroy(): void; dispose(): void }
) {
  const host = getSlotElement(parent, slotKey)
  while (host.firstChild) host.removeChild(host.firstChild)
  const child = mount(host)
  const track: ((c: MountedChild) => MountedChild) | undefined = (parent as any).__hrbrTrackChild
  if (track) {
    track({
      destroy() {
        child.dispose()
        child.destroy()
      },
    })
  }
  return child
}

/**
 * Mount a block and wire reactive slot computations via signals.
 *
 * Contract:
 * - `slots` is a list of `{ key, read }` where `read()` may access signals.
 * - When the reactive graph triggers, we schedule `block.update({[key]: read()})` in the requested lane.
 */
export function mountCompiledBlock(
  def: BlockDef,
  host: Element,
  slots: CompiledSlot[],
  options: MountCompiledBlockOptions = {}
): MountedBlock & { dispose(): void } {
  const lane = options.lane ?? 'default'
  const scheduler = options.scheduler ?? createScheduler()

  // initial values from slots
  const initialValues: Record<string, unknown> = Object.create(null)
  for (const s of slots) initialValues[s.key] = s.read()

  const block = mountBlock(def, host, initialValues)

  // Coalesce multiple slot invalidations into a single scheduled update.
  // This avoids N scheduled tasks per slot and reduces repeated work when
  // many signals change in the same microtask/animation frame.
  let scheduled = false
  const pending: Record<string, unknown> = Object.create(null)

  function flushPending() {
    scheduled = false
    const values = Object.assign(Object.create(null), pending)
    for (const k of Object.keys(pending)) delete pending[k]
    batch(() => block.update(values))
  }

  const effects = slots.map((s) =>
    createEffect(() => {
      const next = s.read()
      pending[s.key] = next
      if (scheduled) return
      scheduled = true
      scheduler.schedule(lane, flushPending)
    })
  )

  let disposed = false

  return Object.assign(block, {
    dispose() {
      if (disposed) return
      disposed = true
      for (const e of effects) e.dispose()
      block.destroy()
    },
  })
}

export function resolvePath(root: Node, path: number[]): Node {
  let node: Node = root
  for (const idx of path) {
    assert(idx >= 0, '[hrbr/block] path indices must be >= 0')
    const next = node.childNodes[idx]
    assert(next != null, `[hrbr/block] invalid path: missing child at index ${idx}`)
    node = next
  }
  return node
}

type PathNode = {
  idx: number
  next: PathNode | null
}

function buildPathTrie(slots: Record<string, BlockSlot>): PathNode {
  const root: PathNode = { idx: -1, next: null }
  const children: Record<number, PathNode> = Object.create(null)

  function getChild(parent: Record<number, PathNode>, idx: number): PathNode {
    let n = parent[idx]
    if (!n) {
      n = { idx, next: null }
      parent[idx] = n
    }
    return n
  }

  for (const slot of Object.values(slots)) {
    let map = children
    for (const idx of slot.path) {
      getChild(map, idx)
      // store nested maps on PathNode.next via a hidden object
      const node = map[idx]!
      if (!(node as any)._children) (node as any)._children = Object.create(null)
      map = (node as any)._children
    }
  }

  ;(root as any)._children = children
  return root
}

function resolvePathCached(root: Node, path: number[], slotKey: string, dev?: boolean): Node {
  // Fast path: empty path just returns root.
  if (path.length === 0) return root

  // Lazily cache step-by-step results on the root element so repeated mounts
  // (and multiple slots sharing prefixes) avoid re-walking childNodes.
  const cacheKey = '__hrbrPathCache'
  let cache: Map<string, Node> | undefined = (root as any)[cacheKey]
  if (!cache) {
    cache = new Map()
    ;(root as any)[cacheKey] = cache
  }

  let node: Node = root
  let prefix = ''
  for (let i = 0; i < path.length; i++) {
    const idx = path[i]!
    assert(idx >= 0, dev ? `[hrbr/block] slot '${slotKey}': path indices must be >= 0` : '[hrbr/block] path indices must be >= 0')
    prefix = prefix ? `${prefix}.${idx}` : String(idx)
    const cached = cache.get(prefix)
    if (cached) {
      node = cached
      continue
    }
    const next = node.childNodes[idx]
    assert(
      next != null,
      dev
        ? `[hrbr/block] slot '${slotKey}': invalid path: missing child at index ${idx} (prefix ${prefix})`
        : `[hrbr/block] invalid path: missing child at index ${idx}`
    )
    node = next
    cache.set(prefix, node)
  }
  return node
}
