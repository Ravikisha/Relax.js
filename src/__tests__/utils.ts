/**
 * Tagged template that given a multiline string, convert it to a single line string.
 * Assuming the string is HTML, it also removes the spaces between tags.
 */
export function singleHtmlLine(str: TemplateStringsArray): string {
  const first = str[0] ?? ''
  return first.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()
}
