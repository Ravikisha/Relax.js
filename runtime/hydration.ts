import { assert } from '../src/utils/assert'
import { mountBlock, type BlockDef, type MountedBlock } from './block'

type ListenerRecord = {
  type: string
  handler: EventListener
}

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

  // Conservative mismatch detection along slot paths: validate node types, and for element slots validate
  // tagName matches the element in the template at the same path.
  // If anything doesn't line up, bail out and do a client-side mount.
  try {
    const expectedRoot = parseTemplateRoot(def.templateHTML)

    for (const [key, slot] of Object.entries(def.slots)) {
  const node = slotNodes[key]
  assert(node != null, `[hrbr/hydrate] missing resolved node for slot '${key}'`)

      if (slot.kind === 'text') {
        assert(node.nodeType === Node.TEXT_NODE, `[hrbr/hydrate] slot '${key}' expected a Text node`)
        continue
      }

      assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${key}' expected an Element node`)

      const expected = resolvePath(expectedRoot, slot.path)
      assert(
        expected.nodeType === Node.ELEMENT_NODE,
        `[hrbr/hydrate] slot '${key}' expected template node to be an Element`
      )

      const expectedEl = expected as Element
      const actualEl = node as Element
      assert(
        expectedEl.tagName.toLowerCase() === actualEl.tagName.toLowerCase(),
        `[hrbr/hydrate] slot '${key}' tag mismatch: expected <${expectedEl.tagName.toLowerCase()}> but found <${actualEl.tagName.toLowerCase()}>`
      )
    }
  } catch {
    host.innerHTML = ''
    return mountBlock(def, host, initialValues)
  }

  const listenersByKey: Record<string, ListenerRecord | undefined> = Object.create(null)
  const prevValues: Record<string, unknown> = Object.create(null)

  const hydrated: HydratedBlock = {
    host,
    root: serverRoot,
    slotNodes,
    update(values) {
      for (const [k, next] of Object.entries(values)) {
        const slot = def.slots[k]
        if (!slot) continue
        const node = slotNodes[k]
        if (!node) continue

        // Skip redundant writes (and listener churn) like mountBlock.
        if (k in prevValues && Object.is(prevValues[k], next)) continue
        prevValues[k] = next

        switch (slot.kind) {
          case 'text': {
            assert(node.nodeType === Node.TEXT_NODE, `[hrbr/hydrate] slot '${k}' expected a Text node`)
            ;(node as Text).nodeValue = next == null ? '' : String(next)
            break
          }

          case 'attr': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = node as Element
            setAttr(el, slot.name, next)
            break
          }

          case 'prop': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = node as any
            setProp(el, slot.name, next)
            break
          }

          case 'class': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = node as Element
            if (next == null || next === false) el.removeAttribute('class')
            else if (Array.isArray(next)) el.setAttribute('class', next.filter(Boolean).join(' '))
            else el.setAttribute('class', String(next))
            break
          }

          case 'style': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = node as HTMLElement
            const style = next as any
            if (style == null || style === false) el.removeAttribute('style')
            else if (typeof style === 'string') el.setAttribute('style', style)
            else if (typeof style === 'object') {
              for (const [kk, vv] of Object.entries(style)) {
                if (vv == null) el.style.removeProperty(kk)
                else el.style.setProperty(kk, String(vv))
              }
            } else el.setAttribute('style', String(style))
            break
          }

          case 'event': {
            assert(node.nodeType === Node.ELEMENT_NODE, `[hrbr/hydrate] slot '${k}' expected an Element node`)
            const el = node as Element

            const prev = listenersByKey[k]
            if (prev) {
              el.removeEventListener(prev.type, prev.handler)
              listenersByKey[k] = undefined
            }

            if (typeof next !== 'function') break

            const handler: EventListener = (ev) => (next as any)(ev)
            el.addEventListener(slot.name, handler)
            listenersByKey[k] = { type: slot.name, handler }
            break
          }
        }
      }
    },
    dispose() {
      hydrated.destroy()
    },
    destroy() {
      // Remove any bound listeners we attached during hydration.
      for (const [key, rec] of Object.entries(listenersByKey)) {
        if (!rec) continue
        const slot = def.slots[key]
        if (!slot || slot.kind !== 'event') continue
        const node = slotNodes[key]
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          ;(node as Element).removeEventListener(rec.type, rec.handler)
        }
      }
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

function parseTemplateRoot(templateHTML: string): Element {
  const tpl = document.createElement('template')
  tpl.innerHTML = templateHTML.trim()
  const root = tpl.content.firstElementChild
  assert(root != null, '[hrbr/hydrate] templateHTML must have a single root element')
  return root as Element
}

function isSvgElement(el: Element): boolean {
  return el.namespaceURI === 'http://www.w3.org/2000/svg'
}

function setMaybeNamespacedAttribute(el: Element, name: string, value: string) {
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
  if (name === 'readOnly') return 'readonly'
  return name.toLowerCase()
}

function setAttr(el: Element, name: string, next: unknown) {
  if (next == null || next === false) {
    removeMaybeNamespacedAttribute(el, normalizeBooleanAttrName(name))
    return
  }
  if (isBooleanishAttribute(name)) {
    setMaybeNamespacedAttribute(el, normalizeBooleanAttrName(name), '')
    return
  }
  setMaybeNamespacedAttribute(el, name, String(next))
}

function setProp(el: any, name: string, next: unknown) {
  if (name === 'value') {
    el.value = next == null ? '' : String(next)
    return
  }
  if (name === 'checked') {
    el.checked = Boolean(next)
    return
  }
  el[name] = next
}
