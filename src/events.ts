import type { ComponentVNode } from './h'

export function addEventListener(
  eventName: string,
  handler: (payload: unknown) => void,
  el: Element,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent: any = null
) {
  const listener = (event: Event) => {
    if (hostComponent) {
      handler.call(hostComponent, event)
    } else {
      handler(event)
    }
  }

  el.addEventListener(eventName, listener)
  return listener
}

export function addEventListeners(
  events: Record<string, (payload: unknown) => void>,
  el: Element,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent: any = null
) {
  const listeners: Record<string, EventListener> = {}
  Object.entries(events).forEach(([eventName, handler]) => {
    listeners[eventName] = addEventListener(eventName, handler, el, hostComponent)
  })

  return listeners
}

export function removeEventListeners(listeners: Record<string, EventListener>, el: Element) {
  Object.entries(listeners).forEach(([eventName, listener]) => {
    el.removeEventListener(eventName, listener)
  })
}
