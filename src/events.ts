import type { ComponentVNode } from './h'

type StableListener = EventListener & {
  __relaxStable?: true
  __relaxHandler?: ((payload: unknown) => void) | null
  __relaxHost?: any
}

export function addEventListener(
  eventName: string,
  handler: (payload: unknown) => void,
  el: Element,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent: any = null
) {
  const listener: StableListener = ((event: Event) => {
    const fn = listener.__relaxHandler
    if (!fn) return

    const host = listener.__relaxHost
    if (host) {
      fn.call(host, event)
    } else {
      fn(event)
    }
  }) as any

  listener.__relaxStable = true
  listener.__relaxHandler = handler
  listener.__relaxHost = hostComponent

  el.addEventListener(eventName, listener)
  return listener as unknown as EventListener
}

/**
 * Update a stable listener wrapper in-place.
 * Contract: only call this for listeners created by addEventListener().
 */
export function updateEventListener(listener: EventListener, handler: ((payload: unknown) => void) | null, hostComponent: any = null) {
  const stable = listener as StableListener
  if (stable && stable.__relaxStable) {
    stable.__relaxHandler = handler
    stable.__relaxHost = hostComponent
  }
}

export function addEventListeners(
  events: Record<string, (payload: unknown) => void>,
  el: Element,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostComponent: any = null
) {
  const listeners: Record<string, EventListener> = {}

  // Hot path: avoid Object.entries() array allocation + per-entry closure.
  for (const eventName in events) {
    const handler = events[eventName]
    if (handler) {
      listeners[eventName] = addEventListener(eventName, handler, el, hostComponent)
    }
  }

  return listeners
}

export function removeEventListeners(listeners: Record<string, EventListener>, el: Element) {
  // Hot path: avoid Object.entries() allocation + closure.
  for (const eventName in listeners) {
    el.removeEventListener(eventName, listeners[eventName]!)
  }
}
