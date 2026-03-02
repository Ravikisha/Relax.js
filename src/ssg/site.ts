import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

export async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir)
  const out: string[] = []

  for (const name of entries) {
    const abs = join(dir, name)
    const st = await stat(abs)
    if (st.isDirectory()) out.push(...(await walkFiles(abs)))
    else out.push(abs)
  }

  return out
}

export async function copyDir(srcDir: string, dstDir: string): Promise<void> {
  await ensureDir(dstDir)
  const entries = await readdir(srcDir)

  for (const name of entries) {
    const srcAbs = join(srcDir, name)
    const dstAbs = join(dstDir, name)
    const st = await stat(srcAbs)

    if (st.isDirectory()) {
      await copyDir(srcAbs, dstAbs)
      continue
    }

    await ensureDir(dirname(dstAbs))
    await copyFile(srcAbs, dstAbs)
  }
}

export function stripExt(path: string): string {
  return path.replace(/\.[a-z0-9]+$/i, '')
}

export type CleanUrlsMode = 'always' | 'never'

export function toOutputPath(relMdPath: string, cleanUrls: CleanUrlsMode): string {
  // relMdPath uses OS separators already (from path.relative()). We'll normalize to forward-slash for URL logic.
  const normalized = relMdPath.replace(/\\/g, '/')

  // index.md => index.html (even in clean URLs mode)
  if (/\/index\.md$/i.test(normalized) || /^index\.md$/i.test(normalized)) {
    return normalized.replace(/\.md$/i, '.html')
  }

  if (cleanUrls === 'always') {
    // about.md => about/index.html
    return stripExt(normalized) + '/index.html'
  }

  return normalized.replace(/\.md$/i, '.html')
}

export function toUrlFromOutPath(outRelPath: string): string {
  const normalized = outRelPath.replace(/\\/g, '/').replace(/^\//, '')
  if (normalized === 'index.html') return '/'
  if (normalized.endsWith('/index.html')) {
    const dir = normalized.slice(0, -'/index.html'.length)
    return '/' + (dir ? dir + '/' : '')
  }
  if (normalized.endsWith('.html')) return '/' + normalized
  return '/' + normalized + '/'
}

export type SitemapEntry = {
  loc: string
  lastmod?: string
}

export function renderSitemapXml(baseUrl: string, entries: SitemapEntry[]): string {
  const base = baseUrl.replace(/\/$/, '')
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

  const urls = entries
    .map((e) => {
      const loc = esc(base + e.loc)
      const lastmod = e.lastmod ? `<lastmod>${esc(e.lastmod)}</lastmod>` : ''
      return `<url><loc>${loc}</loc>${lastmod}</url>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}
