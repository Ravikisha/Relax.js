export function escapeHtmlText(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function escapeHtmlAttr(input: string): string {
  return escapeHtmlText(input).replaceAll('"', '&quot;')
}
