/**
 * Dispatcher that registers handler functions to respond to specific
 * commands, identified by a unique name.
 *
 * The dispatcher also allows registering handler functions that run after
 * a command is handled.
 */
export class Dispatcher {
  #subs = new Map<string, Array<(payload: unknown) => void>>()
  #afterHandlers: Array<() => void> = []

  subscribe(commandName: string, handler: (payload: unknown) => void) {
    if (!this.#subs.has(commandName)) {
      this.#subs.set(commandName, [])
    }

    const handlers = this.#subs.get(commandName)!
    if (handlers.includes(handler)) {
      return () => {}
    }

    handlers.push(handler)

    return () => {
      const idx = handlers.indexOf(handler)
      handlers.splice(idx, 1)
    }
  }

  afterEveryCommand(handler: () => void) {
    this.#afterHandlers.push(handler)

    return () => {
      const idx = this.#afterHandlers.indexOf(handler)
      this.#afterHandlers.splice(idx, 1)
    }
  }

  dispatch(commandName: string, payload: unknown) {
    if (this.#subs.has(commandName)) {
      this.#subs.get(commandName)!.forEach((handler) => handler(payload))
    } else {
      if (typeof console?.warn === 'function') {
        console.warn(`No handlers for command: ${commandName}`)
      }
    }

    this.#afterHandlers.forEach((handler) => handler())
  }
}
