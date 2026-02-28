import { mountBlock, type BlockDef } from './block'

export type RenderBlockToStringOptions = {
  /** Optional initial slot values applied before serialization. */
  initialValues?: Record<string, unknown>
}

/**
 * Render a BlockDef to an HTML string.
 *
 * V1 implementation:
 * - Uses a detached DOM via the platform's Document implementation.
 * - Mounts the block with optional `initialValues`.
 * - Serializes the result via `innerHTML`.
 *
 * This is intentionally simple and primarily intended for tests/examples.
 * A future implementation can avoid DOM usage by emitting HTML directly.
 */
export function renderBlockToString(def: BlockDef, options: RenderBlockToStringOptions = {}): string {
  const host = document.createElement('div')
  const mounted = mountBlock(def, host, options.initialValues ?? {})
  const html = host.innerHTML
  mounted.destroy()
  return html
}
