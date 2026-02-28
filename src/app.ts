import { mountDOM } from './mount-dom'
import { destroyDOM } from './destroy-dom'
import { h, type VNode } from './h'

export type Application = {
  mount: (parentEl: HTMLElement) => void
  unmount: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createApp(RootComponent: any, props: Record<string, unknown> = {}): Application {
  let parentEl: HTMLElement | null = null
  let isMounted = false
  let vdom: VNode | null = null

  function reset() {
    parentEl = null
    isMounted = false
    vdom = null
  }

  return {
    mount(_parentEl) {
      if (isMounted) {
        throw new Error('The application is already mounted')
      }

      parentEl = _parentEl
      vdom = h(RootComponent, props) as unknown as VNode
      mountDOM(vdom as any, parentEl)

      isMounted = true
    },

    unmount() {
      if (!isMounted) {
        throw new Error('The application is not mounted')
      }
      if (!vdom) {
        reset()
        return
      }

      destroyDOM(vdom as any)
      reset()
    },
  }
}
