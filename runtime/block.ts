import { assert } from '../src/utils/assert'
import { batch, createEffect } from './signals'
import { createScheduler, type Lane } from './scheduler'

export type BlockSlotKind = 'text' | 'attr'

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

export type BlockSlot = TextSlot | AttrSlot | PropSlot | ClassSlot | StyleSlot

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

export type MountedBlock = {
  host: Element
  root: Element
  slotNodes: Record<string, Node>
  update(values: Record<string, unknown>): void
  destroy(): void
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

export function mountBlock(def: BlockDef, host: Element, initialValues: Record<string, unknown> = {}): MountedBlock {
  const root = parseTemplate(def.templateHTML)
  const instanceRoot = root.cloneNode(true) as Element

  host.appendChild(instanceRoot)

  const slotNodes: Record<string, Node> = Object.create(null)

  for (const [name, slot] of Object.entries(def.slots)) {
    const node = resolvePath(instanceRoot, slot.path)
    slotNodes[name] = node
  }

  const block: MountedBlock = {
    host,
    root: instanceRoot,
    slotNodes,
    update(values) {
      for (const [key, next] of Object.entries(values)) {
        const slot = def.slots[key]
        if (!slot) continue

        const node = slotNodes[key]
        if (!node) continue

        switch (slot.kind) {
          case 'text': {
            assert(node.nodeType === Node.TEXT_NODE, `[hrbr/block] slot '${key}' expected a Text node`)
            ;(node as Text).nodeValue = next == null ? '' : String(next)
            break
          }

          case 'attr': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as Element
            if (next == null || next === false) {
              el.removeAttribute(slot.name)
            } else {
              el.setAttribute(slot.name, String(next))
            }
            break
          }

          case 'prop': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as any
            el[slot.name] = next
            break
          }

          case 'class': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as Element
            if (next == null || next === false) {
              el.removeAttribute('class')
            } else if (Array.isArray(next)) {
              el.setAttribute('class', next.filter(Boolean).join(' '))
            } else {
              el.setAttribute('class', String(next))
            }
            break
          }

          case 'style': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/block] slot '${key}' expected an Element node`)
            const el = node as HTMLElement
            const style = next as any
            if (style == null || style === false) {
              el.removeAttribute('style')
            } else if (typeof style === 'string') {
              el.setAttribute('style', style)
            } else if (typeof style === 'object') {
              for (const [k, v] of Object.entries(style)) {
                if (v == null) {
                  el.style.removeProperty(k)
                } else {
                  el.style.setProperty(k, String(v))
                }
              }
            } else {
              el.setAttribute('style', String(style))
            }
            break
          }
        }
      }
    },
    destroy() {
      instanceRoot.remove()
    },
  }

  block.update(initialValues)
  return block
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

  return Object.assign(block, {
    dispose() {
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
