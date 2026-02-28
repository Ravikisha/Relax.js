import { DOM_TYPES } from './h'

type TraverseCallback = (node: any, parent?: any) => boolean | void

// Depth-first traversal with the API used by the existing test suite.
// If the callback returns `false`, the traversal skips that node's children.
export function traverseDFS(
  vdom: any,
  cb: TraverseCallback,
  skipBranch?: (node: any) => boolean,
  parent?: any
) {
  if (skipBranch?.(vdom)) {
    return true
  }

  const res = cb(vdom, parent)
  if (res === false) {
    return true
  }

  if (vdom?.type === DOM_TYPES.COMPONENT) {
    if (vdom.component?.vdom) traverseDFS(vdom.component.vdom, cb, skipBranch, vdom)
    return true
  }

  const children = vdom?.children
  if (Array.isArray(children)) {
    for (const child of children) {
    traverseDFS(child, cb, skipBranch, vdom)
    }
  }

  return true
}

// Backward-compatible alias.
export function traverseDOM(vdom: any, cb: (v: any) => void) {
  return traverseDFS(vdom, (node) => {
    cb(node)
  })
}
