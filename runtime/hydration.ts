import { assert } from '../src/utils/assert'
import { mountBlock, type BlockDef, type MountedBlock } from './block'

export type HydratedBlock = MountedBlock

/**
 * Hydrate a server-rendered block.
 *
 * Assumptions for V1:
 * - `host` contains exactly one root element that matches `def.templateHTML` structure.
 * - We do not mutate the DOM during hydration; we only resolve slot node references.
 * - On mismatch, we bail out and remount the block client-side.
 */
export function hydrateBlock(def: BlockDef, host: Element, initialValues: Record<string, unknown> = {}): HydratedBlock {
  const serverRoot = host.firstElementChild
  if (!serverRoot) {
    // Nothing to hydrate; just mount
    return mountBlock(def, host, initialValues)
  }

  // Very conservative mismatch detection: compare tagName of root.
  const expectedRootTag = getRootTagName(def.templateHTML)
  if (expectedRootTag && serverRoot.tagName.toLowerCase() !== expectedRootTag) {
    host.innerHTML = ''
    return mountBlock(def, host, initialValues)
  }

  // Resolve slot nodes against the existing DOM.
  const slotNodes: Record<string, Node> = Object.create(null)
  for (const [key, slot] of Object.entries(def.slots)) {
    const node = resolvePath(serverRoot, slot.path)
    slotNodes[key] = node
  }

  const hydrated: HydratedBlock = {
    host,
    root: serverRoot,
    slotNodes,
    update(values) {
      // delegate to the same patching semantics as mountBlock by temporarily mounting a lightweight facade
      // This avoids duplicating slot patching logic.
      const facade: MountedBlock = {
        host,
        root: serverRoot,
        slotNodes,
        update: () => {},
        destroy: () => {},
      }

      // Reuse mountBlock's patch logic by calling the internal updater route.
      // Since it's currently implemented inline in mountBlock, we mirror the same logic here.
      for (const [k, next] of Object.entries(values)) {
        const s = def.slots[k]
        if (!s) continue
        const n = slotNodes[k]
        if (!n) continue

        switch (s.kind) {
          case 'text': {
            assert(n.nodeType === Node.TEXT_NODE, `[hrbr/hydrate] slot '${k}' expected a Text node`)
            ;(n as Text).nodeValue = next == null ? '' : String(next)
            break
          }
          case 'attr': {
            assert(n.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = n as Element
            if (next == null || next === false) el.removeAttribute(s.name)
            else el.setAttribute(s.name, String(next))
            break
          }
          case 'prop': {
            assert(n.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            ;(n as any)[s.name] = next
            break
          }
          case 'class': {
            assert(n.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = n as Element
            if (next == null || next === false) el.removeAttribute('class')
            else if (Array.isArray(next)) el.setAttribute('class', next.filter(Boolean).join(' '))
            else el.setAttribute('class', String(next))
            break
          }
          case 'style': {
            assert(n.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = n as HTMLElement
            const style = next as any
            if (style == null || style === false) el.removeAttribute('style')
            else if (typeof style === 'string') el.setAttribute('style', style)
            else if (typeof style === 'object') {
              for (const [kk, vv] of Object.entries(style)) {
                if (vv == null) el.style.removeProperty(kk)
                else el.style.setProperty(kk, String(vv))
              }
            } else {
              el.setAttribute('style', String(style))
            }
            break
          }
        }
      }

      void facade
    },
    destroy() {
      serverRoot.remove()
    },
  }

  hydrated.update(initialValues)
  return hydrated
}

export function resolvePath(root: Node, path: number[]): Node {
  let node: Node = root
  for (const idx of path) {
    assert(idx >= 0, '[hrbr/hydrate] path indices must be >= 0')
    const next = node.childNodes[idx]
    assert(next != null, `[hrbr/hydrate] invalid path: missing child at index ${idx}`)
    node = next
  }
  return node
}

function getRootTagName(templateHTML: string): string | null {
  const trimmed = templateHTML.trim()
  if (!trimmed.startsWith('<')) return null
  const m = /^<\s*([a-zA-Z0-9-]+)/.exec(trimmed)
  return m?.[1]?.toLowerCase() ?? null
}
