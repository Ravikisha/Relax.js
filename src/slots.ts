import { DOM_TYPES, type VNode } from './h'

/**
 * Traverses the vdom tree, finds the first slot node and replaces it with the
 * passed in children.
 */
export function fillSlots(vdom: any, children: VNode[]) {
  if (!vdom) return

  if (vdom.type === DOM_TYPES.SLOT) {
    const defaultContent = Array.isArray(vdom.children) ? vdom.children : []
    const externalContent = Array.isArray(children) ? children : []
    const content = externalContent.length > 0 ? externalContent : defaultContent

    vdom.type = DOM_TYPES.FRAGMENT

    if (content.length === 0) {
      vdom.children = []
      return
    }

    // `hSlot([defaultContent])` passes an array whose first element is itself an array.
    // In that case we keep that shape: fragment children = [defaultContent].
    const first = content[0] as any
    if (Array.isArray(first) && content.length === 1) {
      // Default slot content: content is already `[defaultContentArray]`.
      vdom.children = content
    } else {
      // External content: keep it as-is, fragment children are the vnodes.
      vdom.children = content
    }
    return
  }

  if (vdom.children) {
    // Walk children and remove emptied slot fragments.
    const nextChildren: any[] = []
    for (const child of vdom.children) {
      if (child?.type === DOM_TYPES.COMPONENT) {
        nextChildren.push(child)
        continue
      }

      fillSlots(child, children)

      // If it was a slot with no content, it becomes an empty fragment -> drop it.
      if (child?.type === DOM_TYPES.FRAGMENT && Array.isArray(child.children) && child.children.length === 0) {
        continue
      }

      nextChildren.push(child)
    }

    vdom.children = nextChildren
  }
}
