import { setAttributes } from './attributes'
import { addEventListeners } from './events'
import { DOM_TYPES, type ComponentVNode, type ElementVNode, type FragmentVNode, type HrbrVNode, type TextVNode, type VNode } from './h'
import { enqueueJob } from './scheduler'
import { extractPropsAndEvents } from './utils/props'

export function mountDOM(
  vdom: any,
  parentEl: HTMLElement,
  index?: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent: any = null
) {
  if (parentEl == null) {
    throw new Error('[mountDOM] Parent element is null')
  }

  switch (vdom.type) {
    case DOM_TYPES.TEXT: {
      createTextNode(vdom as TextVNode, parentEl, index)
      break
    }

    case DOM_TYPES.ELEMENT: {
      createElementNode(vdom as ElementVNode, parentEl, index, hostComponent)
      break
    }

    case DOM_TYPES.FRAGMENT: {
      createFragmentNodes(vdom as FragmentVNode, parentEl, index, hostComponent)
      break
    }

    case DOM_TYPES.COMPONENT: {
      createComponentNode(vdom as ComponentVNode, parentEl, index, hostComponent)
      enqueueJob(() => (vdom as any).component.onMounted())
      break
    }

    case DOM_TYPES.HRBR: {
      createHrbrNode(vdom as HrbrVNode, parentEl, index)
      break
    }

    default: {
      throw new Error(`Can't mount DOM of type: ${vdom.type}`)
    }
  }
}

function createHrbrNode(vdom: HrbrVNode, parentEl: Element, index?: number | null) {
  // We mount HRBR output into a dedicated host element so it can be moved/removed as a unit.
  const host = document.createElement('span')
  ;(host as any).dataset.hrbr = '1'
  vdom.host = host as any
  insert(host, parentEl, index)

  const instance = vdom.mount(host)
  vdom.instance = instance

  // IMPORTANT: `vdom.el` must point at the actual DOM node the VDOM owns.
  // For HRBR we own the host container, not the host's first child.
  // This allows patchDOM's replace-path to find the correct index via oldVdom.el.
  vdom.el = host
}

function createTextNode(vdom: TextVNode, parentEl: Element, index?: number | null) {
  const { value } = vdom

  const textNode = document.createTextNode(value)
  vdom.el = textNode

  insert(textNode, parentEl, index)
}

function createElementNode(
  vdom: ElementVNode,
  parentEl: Element,
  index?: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent?: any
) {
  const { tag, children } = vdom

  const element = document.createElement(tag)
  addProps(element, vdom, hostComponent)
  vdom.el = element

  // Hot path: avoid per-child closure allocations from `.forEach()`.
  for (let i = 0; i < children.length; i++) {
    mountDOM(children[i] as any, element as any, null as any, hostComponent)
  }
  insert(element, parentEl, index)
}

function addProps(el: Element, vdom: ElementVNode, hostComponent: any) {
  const { props: attrs, events } = extractPropsAndEvents(vdom as any)

  ;(vdom as any).listeners = addEventListeners(events as any, el, hostComponent)
  setAttributes(el as HTMLElement, attrs as any)
}

function createFragmentNodes(
  vdom: FragmentVNode,
  parentEl: Element,
  index?: number | null,
  hostComponent?: any
) {
  const { children } = vdom
  vdom.el = parentEl as any

  let idx = index ?? null
  for (const child of children) {
    mountDOM(child as any, parentEl as any, idx as any, hostComponent)

    if (idx == null) {
      continue
    }

    switch ((child as any).type) {
      case DOM_TYPES.FRAGMENT:
        idx += (child as any).children.length
        break
      case DOM_TYPES.COMPONENT:
        idx += (child as any).component.elements.length
        break
      default:
        idx++
    }
  }
}

function createComponentNode(
  vdom: ComponentVNode,
  parentEl: Element,
  index?: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent?: any
) {
  const { tag: Component, children } = vdom
  const { props, events } = extractPropsAndEvents(vdom as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component = new (Component as any)(props, events, hostComponent)
  component.setExternalContent(children as any)

  component.mount(parentEl as any, index as any)
  ;(vdom as any).component = component
  ;(vdom as any).el = component.firstElement
}

function insert(el: Node, parentEl: Element, index?: number | null) {
  if (index == null) {
    parentEl.append(el)
    return
  }

  if (index < 0) {
    throw new Error(`Index must be a positive integer, got ${index}`)
  }

  const children = parentEl.childNodes
  if (index >= children.length) {
    parentEl.append(el)
  } else {
  parentEl.insertBefore(el, children[index] ?? null)
  }
}
