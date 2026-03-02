import { DOM_TYPES, type ComponentVNode, type ElementVNode, type FragmentVNode, type HrbrVNode, type SlotVNode, type TextVNode, type VNode, isComponent } from '../h'
import { escapeHtmlAttr, escapeHtmlText } from './escape'
import type { RenderPageToStringOptions, RenderToStringOptions, RenderedPage } from './types'

const voidTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

export function renderToString(vdom: VNode, _options: RenderToStringOptions = {}): string {
  switch (vdom.type) {
    case DOM_TYPES.TEXT:
      return escapeHtmlText((vdom as TextVNode).value)

    case DOM_TYPES.FRAGMENT:
  return (vdom as FragmentVNode).children.map((c) => renderToString(c, _options)).join('')

    case DOM_TYPES.SLOT:
  return ((vdom as SlotVNode).children ?? []).map((c) => renderToString(c, _options)).join('')

    case DOM_TYPES.ELEMENT:
      return renderElementToString(vdom as ElementVNode)

    case DOM_TYPES.COMPONENT:
      return renderComponentToString(vdom as ComponentVNode)

    case DOM_TYPES.HRBR:
      // HRBR blocks already have an SSR helper in `runtime/ssr.ts`.
      // For the vdom renderer, we render a placeholder container. Users should prefer HRBR SSR APIs.
      return '<span data-hrbr="1"></span>'

    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unsupported VNode type in renderToString(): ${(vdom as any).type}`)
  }
}

function renderComponentToString(vdom: ComponentVNode): string {
  // The VDOM shape supports component "classes" returned by defineComponent().
  // We can instantiate and call render() without mounting.
  const Component: any = vdom.tag

  // If tag is a function but not a class-like component, treat as dynamic and call it.
  // This keeps things flexible for SSG.
  if (!isComponent(vdom)) {
    throw new Error('[ssg] Expected component tag to be a function/class')
  }

  // For defineComponent, constructor(props, eventHandlers, parentComponent)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const instance = new Component(vdom.props ?? {}, {}, null)
  instance.setExternalContent(vdom.children ?? [])
  const out = instance.render()
  return renderToString(out)
}

function renderElementToString(vdom: ElementVNode): string {
  const tag = vdom.tag
  const attrs = renderAttrs(vdom.props ?? {})

  if (voidTags.has(tag)) {
    return `<${tag}${attrs}>`
  }

  const innerHTML = (vdom.props ?? {}).innerHTML
  const children =
    typeof innerHTML === 'string' ? innerHTML : (vdom.children ?? []).map((c) => renderToString(c)).join('')
  return `<${tag}${attrs}>${children}</${tag}>`
}

function renderAttrs(props: Record<string, unknown>): string {
  let out = ''

  for (const [k, v] of Object.entries(props)) {
  if (k === 'on' || k === 'key' || k === 'innerHTML') continue

    if (k === 'class') {
      const cls = renderClass(v)
      if (cls) out += ` class="${escapeHtmlAttr(cls)}"`
      continue
    }

    if (k === 'style') {
      const style = renderStyle(v)
      if (style) out += ` style="${escapeHtmlAttr(style)}"`
      continue
    }

    if (v === false || v == null) {
      continue
    }

    // Boolean attributes.
    if (v === true) {
      out += ` ${k}`
      continue
    }

    out += ` ${k}="${escapeHtmlAttr(String(v))}"`
  }

  return out
}

function renderClass(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(' ')
  return ''
}

function renderStyle(v: unknown): string {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return ''
  const entries = Object.entries(v as Record<string, unknown>)
  return entries
    .filter(([, val]) => val != null)
    .map(([name, val]) => `${name}:${String(val)}`)
    .join(';')
}

export function renderPageToString(
  vdom: VNode,
  data: Record<string, unknown> = {},
  options: RenderPageToStringOptions = {}
): RenderedPage {
  const body = renderToString(vdom, options)

  const lang = options.lang ?? 'en'
  const title = options.title ?? (typeof data.title === 'string' ? (data.title as string) : '')

  const headParts: string[] = []
  if (title) headParts.push(`<title>${escapeHtmlText(title)}</title>`)
  if (options.head) headParts.push(options.head)

  const head = headParts.join(options.pretty ? '\n' : '')

  const htmlAttrs = renderPlainAttrs(options.htmlAttrs)
  const bodyAttrs = renderPlainAttrs(options.bodyAttrs)

  const html = `<!doctype html><html lang="${escapeHtmlAttr(lang)}"${htmlAttrs}><head>${head}</head><body${bodyAttrs}>${body}</body></html>`

  return { html, head, body, data }
}

function renderPlainAttrs(attrs: Record<string, string> | undefined): string {
  if (!attrs) return ''
  let out = ''
  for (const [k, v] of Object.entries(attrs)) {
    out += ` ${k}="${escapeHtmlAttr(String(v))}"`
  }
  return out
}
