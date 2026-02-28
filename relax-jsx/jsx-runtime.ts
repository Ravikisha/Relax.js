// Minimal TSX runtime for Relax.js (typing + JSX factory integration).
//
// With tsconfig: { "jsx": "react-jsx", "jsxImportSource": "relax-jsx" }
// TypeScript will emit imports from `relax-jsx/jsx-runtime`.
//
// We keep this tiny: it just delegates to Relax's existing `h` implementation.

import { h, hFragment } from '../src/h'

// For `<>...</>` fragments, TS will pass this value as `type`.
// We use Relax's actual fragment vnode factory so the runtime can mount it.
export const Fragment = hFragment as any

export function jsx(type: any, props: any, key?: any) {
  return jsxImpl(type, props, key)
}

export function jsxs(type: any, props: any, key?: any) {
  return jsxImpl(type, props, key)
}

function jsxImpl(type: any, props: any, key?: any) {
  const { children, ...rest } = props ?? {}
  const normalizedChildren = children == null ? [] : Array.isArray(children) ? children : [children]

  // React-like prop compat:
  // - className -> class
  // - onClick/onInput/... -> on: { click/input/... }
  const normalizedProps: any = { ...rest }
  if (normalizedProps.className != null && normalizedProps.class == null) {
    normalizedProps.class = normalizedProps.className
    delete normalizedProps.className
  }

  for (const k of Object.keys(normalizedProps)) {
    if (k.length > 2 && k.startsWith('on') && typeof normalizedProps[k] === 'function') {
      const eventName = k.slice(2)
      const domEvent = eventName.charAt(0).toLowerCase() + eventName.slice(1)
      normalizedProps.on ??= {}
      normalizedProps.on[domEvent] = normalizedProps[k]
      delete normalizedProps[k]
    }
  }

  const finalProps = key == null ? normalizedProps : { ...normalizedProps, key }

  // Fragment
  if (type === Fragment) {
    return hFragment(normalizedChildren)
  }

  return h(type, finalProps, normalizedChildren)
}
