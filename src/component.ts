import equal from 'fast-deep-equal'
import { destroyDOM } from './destroy-dom'
import { Dispatcher } from './dispatcher'
import {
  DOM_TYPES,
  didCreateSlot,
  extractChildren,
  resetDidCreateSlot,
  type VNode,
} from './h'
import { mountDOM } from './mount-dom'
import { patchDOM } from './patch-dom'
import { hasOwnProperty } from './utils/objects'
import { fillSlots } from './slots'

const emptyFn = () => {}

export type DefineComponentArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (this: any) => VNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state?: (props?: Record<string, any>) => Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMounted?: (this: any) => Promise<void> | void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUnmounted?: (this: any) => Promise<void> | void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineComponent({ render, state, onMounted = emptyFn, onUnmounted = emptyFn, ...methods }: DefineComponentArgs): any {
  class Component {
    #isMounted = false
    #vdom: VNode | null = null
    #hostEl: HTMLElement | null = null
    #eventHandlers: Record<string, (payload: unknown) => void> | null = null
    #parentComponent: any = null
    #dispatcher = new Dispatcher()
    #subscriptions: Array<() => void> = []
    #children: VNode[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: Record<string, any>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(props: Record<string, any> = {}, eventHandlers: Record<string, any> = {}, parentComponent: any = null) {
      this.props = props
      this.state = state ? state(props) : {}
      this.#eventHandlers = eventHandlers
      this.#parentComponent = parentComponent
    }

    onMounted() {
      return Promise.resolve(onMounted.call(this))
    }

    onUnmounted() {
      return Promise.resolve(onUnmounted.call(this))
    }

    get parentComponent() {
      return this.#parentComponent
    }

    get vdom() {
      return this.#vdom
    }

    get elements(): Array<Element> {
      if (this.#vdom == null) {
        return []
      }

      if ((this.#vdom as any).type === DOM_TYPES.FRAGMENT) {
        return extractChildren(this.#vdom as any).flatMap((child: any) => {
          if (child.type === DOM_TYPES.COMPONENT) {
            return child.component.elements
          }
          return [child.el]
        })
      }

      return [(this.#vdom as any).el]
    }

    get firstElement() {
      return this.elements[0]
    }

    get offset() {
      if ((this.#vdom as any)?.type === DOM_TYPES.FRAGMENT) {
        return Array.from((this.#hostEl as HTMLElement).children).indexOf(this.firstElement as Element)
      }
      return 0
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateProps(props: Record<string, any>) {
      const newProps = { ...this.props, ...props }
      if (equal(this.props, newProps)) {
        return
      }

      this.props = newProps
      this.#patch()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateState(stateArg: Record<string, any>) {
      this.state = { ...this.state, ...stateArg }
      this.#patch()
    }

    setExternalContent(children: VNode[]) {
      this.#children = children
    }

    render() {
      const vdom = render.call(this)

      if (didCreateSlot()) {
        fillSlots(vdom as any, this.#children)
        resetDidCreateSlot()
      }

      return vdom
    }

    mount(hostEl: HTMLElement, index: number | null = null) {
      if (this.#isMounted) {
        throw new Error('Component is already mounted')
      }

      this.#vdom = this.render()
      mountDOM(this.#vdom as any, hostEl, index as any, this as any)
      this.#wireEventHandlers()

      this.#isMounted = true
      this.#hostEl = hostEl
    }

    #wireEventHandlers() {
      this.#subscriptions = Object.entries(this.#eventHandlers ?? {}).map(([eventName, handler]) =>
        this.#wireEventHandler(eventName, handler)
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #wireEventHandler(eventName: string, handler: any) {
      return this.#dispatcher.subscribe(eventName, (payload) => {
        if (this.#parentComponent) {
          handler.call(this.#parentComponent, payload)
        } else {
          handler(payload)
        }
      })
    }

    unmount() {
      if (!this.#isMounted) {
        throw new Error('Component is not mounted')
      }

      destroyDOM(this.#vdom as any)
      this.#subscriptions.forEach((unsubscribe) => unsubscribe())

      this.#vdom = null
      this.#isMounted = false
      this.#hostEl = null
      this.#subscriptions = []
    }

    emit(eventName: string, payload?: unknown) {
      this.#dispatcher.dispatch(eventName, payload)
    }

    #patch() {
      if (!this.#isMounted) {
        throw new Error('Component is not mounted')
      }

      const vdom = this.render()
      this.#vdom = patchDOM(this.#vdom as any, vdom as any, this.#hostEl as any, this as any)
    }
  }

  for (const methodName in methods) {
    if (hasOwnProperty(Component, methodName)) {
      throw new Error(
        `Method "${methodName}()" already exists in the component. Can't override existing methods.`
      )
    }

    ;(Component.prototype as any)[methodName] = (methods as any)[methodName]
  }

  return Component
}
