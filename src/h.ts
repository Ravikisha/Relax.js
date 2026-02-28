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
  el?: Text
}

export type FragmentVNode = {
  type: typeof DOM_TYPES.FRAGMENT
  children: VNode[]
  el?: Element
  parentFragment?: FragmentVNode
}

export type SlotVNode = {
  type: typeof DOM_TYPES.SLOT
  children?: VNode[]
}

export type ElementVNode = {
  type: typeof DOM_TYPES.ELEMENT
  tag: string
  props: ElementVNodeProps
  children: VNode[]
  el?: HTMLElement
  listeners?: Record<string, EventListener>
}

export type ComponentVNode = {
  type: typeof DOM_TYPES.COMPONENT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tag: any
  props: ElementVNodeProps
  children: VNode[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: any
  el?: Element
}

export type HrbrVNode = {
  type: typeof DOM_TYPES.HRBR
  /** A mount function returned by the HRBR compiler transform: (host) => MountedBlock|MountedFallback */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mount: (host: Element) => { update?: (values: any) => void; dispose?: () => void; destroy: () => void }
  /** Internal: mounted instance returned from `mount(host)` */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance?: any
  /** Internal: the host element that contains the block/fallback region */
  host?: HTMLElement
  /** Internal: first element produced by the block/fallback region (for component vnode .el tracking) */
  el?: Element
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

  return {
    tag: tag as any,
    props: props as ElementVNodeProps,
    type,
    children: mapTextNodes(withoutNulls(children as any[])) as VNode[],
  } as any
}

export function isComponent({ tag }: { tag: unknown }) {
  return typeof tag === 'function'
}

export function hString(str: unknown): TextVNode {
  return { type: DOM_TYPES.TEXT, value: String(str) }
}

export function hFragment(vNodes: unknown[]): FragmentVNode {
  assert(Array.isArray(vNodes), '[vdom] hFragment() expects an array of vNodes')

  return {
    type: DOM_TYPES.FRAGMENT,
    children: mapTextNodes(withoutNulls(vNodes as any[])) as VNode[],
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
  return { type: DOM_TYPES.HRBR, mount }
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
  if (vdom.children == null) {
    return []
  }

  const children: VNode[] = []

  for (const child of vdom.children) {
    if ((child as any).type === DOM_TYPES.FRAGMENT) {
      children.push(...extractChildren(child as any))
    } else {
      children.push(child)
    }
  }

  return children
}
