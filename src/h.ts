import { withoutNulls } from './utils/arrays'
import { assert } from './utils/assert'

export const DOM_TYPES = {
  TEXT: 'text',
  ELEMENT: 'element',
  FRAGMENT: 'fragment',
  COMPONENT: 'component',
  SLOT: 'slot',
  HRBR: 'hrbr',
} as const

export type DomType = (typeof DOM_TYPES)[keyof typeof DOM_TYPES]

export type AnyProps = Record<string, unknown>

export type ElementVNodeProps = {
  on?: Record<string, (payload: unknown) => void>
  class?: string | string[]
  style?: Record<string, string>
  key?: unknown
} & Record<string, unknown>

export type TextVNode = {
  type: typeof DOM_TYPES.TEXT
  value: string
  // Initialized upfront for stable shapes.
  el: Text | null
}

export type FragmentVNode = {
  type: typeof DOM_TYPES.FRAGMENT
  children: VNode[]
  // Initialized upfront for stable shapes.
  el: Element | null
  parentFragment: FragmentVNode | null
}

export type SlotVNode = {
  type: typeof DOM_TYPES.SLOT
  // Initialized upfront for stable shapes.
  children: VNode[] | null
}

export type ElementVNode = {
  type: typeof DOM_TYPES.ELEMENT
  tag: string
  props: ElementVNodeProps
  children: VNode[]
  // Initialized upfront for stable shapes.
  el: HTMLElement | null
  listeners: Record<string, EventListener> | null
}

export type ComponentVNode = {
  type: typeof DOM_TYPES.COMPONENT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tag: any
  props: ElementVNodeProps
  children: VNode[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Initialized upfront for stable shapes.
  component: any | null
  el: Element | null
}

export type HrbrVNode = {
  type: typeof DOM_TYPES.HRBR
  /** A mount function returned by the HRBR compiler transform: (host) => MountedBlock|MountedFallback */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mount: (host: Element) => { update?: (values: any) => void; dispose?: () => void; destroy: () => void }
  /** Internal: mounted instance returned from `mount(host)` */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: any | null
  /** Internal: the host element that contains the block/fallback region */
  host: HTMLElement | null
  /** Internal: first element produced by the block/fallback region (for component vnode .el tracking) */
  el: Element | null
}

export type VNode = TextVNode | ElementVNode | FragmentVNode | ComponentVNode | SlotVNode | HrbrVNode

export function h(tag: string | unknown, props: Record<string, unknown> = {}, children: unknown[] = []): ElementVNode | ComponentVNode {
  const type = typeof tag === 'string' ? DOM_TYPES.ELEMENT : DOM_TYPES.COMPONENT

  assert(
    typeof props === 'object' && !Array.isArray(props),
    '[vdom] h() expects an object as props (2nd argument)'
  )
  assert(
    Array.isArray(children),
    `[vdom] h() expects an array of children (3rd argument), but got '${typeof children}'`
  )

  const normalizedChildren = mapTextNodes(withoutNulls(children as any[])) as VNode[]

  // Stable-shape VNodes: initialize common optional runtime fields up-front.
  if (type === DOM_TYPES.ELEMENT) {
    return {
      tag: tag as any,
      props: props as ElementVNodeProps,
      type,
      children: normalizedChildren,
      el: null,
      listeners: null,
    }
  }

  return {
    tag: tag as any,
    props: props as ElementVNodeProps,
    type,
    children: normalizedChildren,
    component: null,
    el: null,
  }
}

export function isComponent({ tag }: { tag: unknown }) {
  return typeof tag === 'function'
}

export function hString(str: unknown): TextVNode {
  return { type: DOM_TYPES.TEXT, value: String(str), el: null }
}

export function hFragment(vNodes: unknown[]): FragmentVNode {
  assert(Array.isArray(vNodes), '[vdom] hFragment() expects an array of vNodes')

  return {
    type: DOM_TYPES.FRAGMENT,
    children: mapTextNodes(withoutNulls(vNodes as any[])) as VNode[],
  el: null,
  parentFragment: null,
  }
}

/**
 * Wrap an HRBR mount factory so it can be returned from VDOM components.
 *
 * Example (compiled output shape):
 *   return hBlock((host) => mountCompiledBlock(def, host, slots))
 */
export function hBlock(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mount: (host: Element) => { update?: (values: any) => void; dispose?: () => void; destroy: () => void }
): HrbrVNode {
  return { type: DOM_TYPES.HRBR, mount, instance: null, host: null, el: null }
}

let hSlotCalled = false

export function didCreateSlot() {
  return hSlotCalled
}

export function resetDidCreateSlot() {
  hSlotCalled = false
}

export function hSlot(children: VNode[] = []): SlotVNode {
  hSlotCalled = true
  return { type: DOM_TYPES.SLOT, children }
}

function mapTextNodes(children: unknown[]): Array<VNode | unknown> {
  return children.map((child) =>
    typeof child === 'string' ||
    typeof child === 'number' ||
    typeof child === 'boolean' ||
    typeof child === 'bigint' ||
    typeof child === 'symbol'
      ? hString(child)
      : child
  )
}

export function extractChildren(vdom: { children?: VNode[] }): VNode[] {
  const root = vdom.children
  if (root == null || root.length === 0) return []

  // Flatten fragments into a single output array.
  // Avoids creating intermediate arrays from `children.push(...extractChildren(fragment))`.
  const out: VNode[] = []
  const stack: VNode[] = root.slice().reverse()

  while (stack.length > 0) {
    const node = stack.pop()!
    if ((node as any).type === DOM_TYPES.FRAGMENT) {
      const fragChildren = (node as any).children as VNode[] | undefined
      if (fragChildren && fragChildren.length) {
        for (let i = fragChildren.length - 1; i >= 0; i--) {
          stack.push(fragChildren[i]!)
        }
      }
    } else {
      out.push(node)
    }
  }

  return out
}
