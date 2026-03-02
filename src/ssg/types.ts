import type { VNode } from '../h'

export type RenderToStringOptions = {
  /** If true, a minimal HTML page wrapper is emitted when calling `renderPageToString`. */
  pretty?: boolean
}

export type RenderedPage = {
  /** Final HTML document string. */
  html: string
  /** Head tags that were assembled (title, meta, etc). */
  head: string
  /** Body HTML only. */
  body: string
  /** Page-level metadata (frontmatter-derived). */
  data: Record<string, unknown>
}

export type RenderPageToStringOptions = RenderToStringOptions & {
  /** Document language, default: 'en' */
  lang?: string
  /** Title override (otherwise computed from `data.title` when present). */
  title?: string
  /** Additional tags injected into <head>. */
  head?: string
  /** Additional attributes for <html>. */
  htmlAttrs?: Record<string, string>
  /** Additional attributes for <body>. */
  bodyAttrs?: Record<string, string>
}

export type MarkdownToPageResult = {
  vdom: VNode
  data: Record<string, unknown>
}

export type SsgPageData = {
  title?: string
  description?: string
  layout?: string | false
  head?: string
  [k: string]: unknown
}
