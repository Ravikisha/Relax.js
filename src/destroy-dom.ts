import { removeEventListeners } from './events'
import { DOM_TYPES } from './h'
import { enqueueJob } from './scheduler'
import { assert } from './utils/assert'

export function destroyDOM(vdom: any) {
  const { type } = vdom

  switch (type) {
    case DOM_TYPES.TEXT: {
      removeTextNode(vdom)
      break
    }

    case DOM_TYPES.ELEMENT: {
      removeElementNode(vdom)
      break
    }

    case DOM_TYPES.FRAGMENT: {
      removeFragmentNodes(vdom)
      break
    }

    case DOM_TYPES.COMPONENT: {
      vdom.component.unmount()
      enqueueJob(() => vdom.component.onUnmounted())
      break
    }

    case DOM_TYPES.HRBR: {
      removeHrbrNode(vdom)
      break
    }

    default: {
      throw new Error(`Can't destroy DOM of type: ${type}`)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete vdom.el
}

function removeHrbrNode(vdom: any) {
  const inst = vdom.instance
  if (inst?.dispose) inst.dispose()
  if (inst?.destroy) inst.destroy()

  const host = vdom.host as HTMLElement | undefined
  if (host) host.remove()

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete vdom.instance
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete vdom.host
}

function removeTextNode(vdom: any) {
  const { el } = vdom
  assert(el instanceof Text)
  el.remove()
}

function removeElementNode(vdom: any) {
  const { el, children, listeners } = vdom
  assert(el instanceof HTMLElement)

  // Cleanup first (listeners + component lifecycles), then detach the root once.
  // Note: we still need to recursively destroy children to run component unmount hooks
  // and remove event listeners stored on descendant vnodes, but we can avoid calling
  // `remove()` on each descendant DOM node because removing the root detaches the subtree.
  if (listeners) {
    removeEventListeners(listeners, el)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete vdom.listeners
  }

  for (let i = 0; i < children.length; i++) {
    destroyDOM(children[i])
  }

  el.remove()
}

function removeFragmentNodes(vdom: any) {
  const { children } = vdom
  for (let i = 0; i < children.length; i++) {
    destroyDOM(children[i])
  }
}
