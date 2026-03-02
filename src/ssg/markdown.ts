import { h, hFragment, type VNode } from '../h'
import type { MarkdownToPageResult } from './types'

// Lazy dependency: we only import `marked` when used.

export type MarkdownToVNodeOptions = {
  /** Wrap output in a container element, default: 'div' */
  wrapperTag?: string
}

export type MarkdownToPageOptions = MarkdownToVNodeOptions & {
  /** If true, parse YAML frontmatter when present. */
  frontmatter?: boolean
}

export async function markdownToVNode(markdown: string, options: MarkdownToVNodeOptions = {}): Promise<VNode> {
  const wrapperTag = options.wrapperTag ?? 'div'
  const { marked } = await importMarked()
  const html = marked.parse(markdown)
  return h(wrapperTag, { innerHTML: String(html) } as any, []) as any
}

export async function markdownToPage(markdown: string, options: MarkdownToPageOptions = {}): Promise<MarkdownToPageResult> {
  const { content, data } = options.frontmatter ? splitFrontmatter(markdown) : { content: markdown, data: {} }
  const vdom = await markdownToVNode(content, options)
  return { vdom, data }
}

async function importMarked(): Promise<{ marked: any }> {
  try {
    return (await import('marked')) as any
  } catch {
    throw new Error('[ssg] Missing dependency "marked". Install it to use markdown features.')
  }
}

function splitFrontmatter(input: string): { content: string; data: Record<string, unknown> } {
  // Very small YAML frontmatter parser:
  // ---
  // title: Hello
  // description: ...
  // ---
  const trimmed = input.replace(/^\ufeff/, '')
  if (!trimmed.startsWith('---')) return { content: input, data: {} }

  const end = trimmed.indexOf('\n---', 3)
  if (end === -1) return { content: input, data: {} }

  const fmBlock = trimmed.slice(3, end).trim()
  const rest = trimmed.slice(end + 4) // skip \n---

  const data: Record<string, unknown> = {}
  for (const line of fmBlock.split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_\-]+)\s*:\s*(.*)$/.exec(line)
    if (!m) continue
  const key = m[1] ?? ''
  const raw = m[2] ?? ''
  if (!key) continue
    data[key] = parseYamlScalar(raw)
  }

  return { content: rest.replace(/^\s*\r?\n/, ''), data }
}

function parseYamlScalar(raw: string): string | number | boolean {
  const v = raw.trim()
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  // strip surrounding quotes
  const q = /^['\"](.*)['\"]$/.exec(v)
  if (q) return q[1] ?? ''
  return v
}
