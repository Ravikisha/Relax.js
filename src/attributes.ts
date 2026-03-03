import type { ElementVNodeProps } from './h'
import { DEV } from './dev'

export function setAttributes(el: HTMLElement, attrs: ElementVNodeProps) {
  const { class: className, style, ...otherAttrs } = attrs

  // Delete the "key" property if it exists
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete (otherAttrs as any).key

  if (className) {
    setClass(el, className)
  }

  if (style) {
    // Hot path: avoid Object.entries() allocation + closure.
    for (const prop in style as any) {
      setStyle(el, prop, (style as any)[prop])
    }
  }

  // Hot path: avoid Object.entries() allocation.
  for (const name in otherAttrs as any) {
    setAttribute(el, name, (otherAttrs as any)[name] as any)
  }
}

export function setAttribute(el: Element, name: string, value: string | number | null) {
  if (value == null) {
    removeAttribute(el, name)
  } else if (name.startsWith('data-')) {
    el.setAttribute(name, String(value))
  } else {
    ;(el as any)[name] = value
  }
}

export function removeAttribute(el: Element, name: string) {
  try {
    ;(el as any)[name] = null
  } catch {
  if (DEV && typeof console?.warn === 'function') {
      console.warn(`Failed to set "${name}" to null on ${(el as any).tagName}`)
    }
  }

  el.removeAttribute(name)
}

export function setStyle(el: HTMLElement, name: string, value: string) {
  ;(el.style as any)[name] = value
}

export function removeStyle(el: HTMLElement, name: string) {
  ;(el.style as any)[name] = null
}

function setClass(el: HTMLElement, className: string | string[]) {
  el.className = ''

  if (typeof className === 'string') {
    el.className = className
  }

  if (Array.isArray(className)) {
    el.classList.add(...className)
  }
}
