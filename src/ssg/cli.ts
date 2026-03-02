import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { h } from '../h'
import { markdownToPage } from './markdown'
import { renderPageToString } from './render-to-string'
import { DEFAULT_CONFIG, loadSsgConfig, mergeConfig, type SsgConfig } from './config'
import { copyDir, ensureDir, renderSitemapXml, toOutputPath, toUrlFromOutPath, walkFiles, type CleanUrlsMode } from './site'

export type SsgCliOptions = {
  inputDir: string
  outputDir: string

  /** Copy static assets from here into output root. default: `<inputDir>/public` if it exists */
  publicDir?: string

  /** If provided, generate sitemap.xml using this base URL (e.g. https://example.com). */
  baseUrl?: string

  /** Control `about.md` -> `about/index.html` behavior. default: 'always' */
  cleanUrls?: CleanUrlsMode

  /** Default layout wrapper applied to every page unless frontmatter sets `layout: false`. default: 'default' */
  defaultLayout?: string

  /** Site title used in nav/header/footer by default layouts. */
  siteName?: string

  /** Path to relax.ssg.config.js (default: cwd/relax.ssg.config.js) */
  configPath?: string
}

export async function buildStaticSite({ inputDir, outputDir }: SsgCliOptions): Promise<void> {
  const absInput = resolve(inputDir)
  const absOutput = resolve(outputDir)

  const userOpts = arguments[0] as SsgCliOptions
  const { config } = await loadSsgConfig(process.cwd(), userOpts.configPath)
  const overrides: SsgConfig = {}
  if (userOpts.cleanUrls) overrides.cleanUrls = userOpts.cleanUrls
  if (userOpts.defaultLayout) overrides.defaultLayout = userOpts.defaultLayout
  if (userOpts.publicDir) overrides.publicDir = userOpts.publicDir
  if (userOpts.baseUrl) overrides.baseUrl = userOpts.baseUrl
  if (userOpts.siteName) overrides.siteName = userOpts.siteName

  const merged: SsgConfig = mergeConfig({ ...DEFAULT_CONFIG, ...config }, overrides)

  const cleanUrls = (merged.cleanUrls ?? 'always') as CleanUrlsMode
  const defaultLayout = merged.defaultLayout ?? 'default'
  const siteName = merged.siteName ?? 'Relax.js'
  const nav = merged.nav

  await ensureDir(absOutput)
  const files = await walkFiles(absInput)
  const mdFiles = files.filter((f) => extname(f).toLowerCase() === '.md')

  const sitemapEntries: { loc: string; lastmod?: string }[] = []

  for (const abs of mdFiles) {
    const rel = relative(absInput, abs)
    const outRel = toOutputPath(rel, cleanUrls)
    const outAbs = join(absOutput, outRel)

    const raw = await readFile(abs, 'utf8')
    const page = await markdownToPage(raw, { frontmatter: true, wrapperTag: 'main' })

    const layoutFromFm = page.data.layout
    const useLayout = layoutFromFm === undefined ? defaultLayout : layoutFromFm

    const headParts: string[] = []
    headParts.push(`<link rel="stylesheet" href="/theme/default.css">`)
    if (typeof page.data.head === 'string') headParts.push(page.data.head)

    const renderOptions: any = {
      head: headParts.join(''),
    }
    if (typeof page.data.title === 'string') renderOptions.title = page.data.title as string

  const layoutCtx = nav ? { siteName, nav } : { siteName }
  const rendered = renderPageToString(wrapWithLayout(useLayout, page, layoutCtx), page.data, renderOptions)

    await mkdir(dirname(outAbs), { recursive: true })
    await writeFile(outAbs, rendered.html, 'utf8')

    sitemapEntries.push({ loc: toUrlFromOutPath(outRel) })
  }

  // Copy theme assets.
  await copyDefaultTheme(absOutput)

  // Copy public assets folder.
  const publicDir = merged.publicDir ? resolve(absInput, merged.publicDir) : resolve(absInput, 'public')
  await tryCopyPublic(publicDir, absOutput)

  // sitemap.xml
  if (merged.baseUrl) {
    const xml = renderSitemapXml(merged.baseUrl, sitemapEntries)
    await writeFile(join(absOutput, 'sitemap.xml'), xml, 'utf8')
  }
}

function wrapWithLayout(
  layout: unknown,
  page: Awaited<ReturnType<typeof markdownToPage>>,
  ctx: { siteName: string; nav?: Array<{ label: string; href: string }> }
) {
  // layout: false => raw content only
  if (layout === false) return page.vdom

  // layout: 'default' (or anything else for now)
  const title = typeof page.data.title === 'string' ? (page.data.title as string) : ''
  const description = typeof page.data.description === 'string' ? (page.data.description as string) : ''

  // Minimal page chrome.
  // We keep it as VDOM so custom components can be used later.
  const navItems = ctx.nav && ctx.nav.length ? ctx.nav : [{ label: 'Home', href: '/' }]
  return h('div', { class: 'container' }, [
    h('header', { class: 'site-header' }, [
      h('h1', { class: 'site-title' }, [ctx.siteName]),
      h('nav', { class: 'site-nav' }, [
        ...navItems.map((item) => h('a', { href: item.href }, [item.label])),
      ]),
    ]),
    title ? h('h2', {}, [title]) : null,
    description ? h('p', { style: { color: 'var(--muted)' } }, [description]) : null,
    page.vdom,
    h('footer', { class: 'site-footer' }, [`Built with Relax.js SSG`]),
  ])
}

async function copyDefaultTheme(outputDir: string): Promise<void> {
  await ensureDir(join(outputDir, 'theme'))
  await writeFile(join(outputDir, 'theme', 'default.css'), DEFAULT_THEME_CSS, 'utf8')
}

async function tryCopyPublic(publicDir: string, outDir: string): Promise<void> {
  try {
    await copyDir(publicDir, outDir)
  } catch {
    // ignore missing public dir
  }
}

const DEFAULT_THEME_CSS = `/* Relax.js SSG default theme (tiny + readable) */

:root {
  --bg: #0b0d10;
  --fg: #e8e8e8;
  --muted: #b7b7b7;
  --link: #7cc4ff;
  --card: #12161d;
  --border: #222a35;
  --code-bg: #0f1320;
  --code-fg: #e8e8e8;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #ffffff;
    --fg: #111111;
    --muted: #555555;
    --link: #005bbb;
    --card: #f6f7f9;
    --border: #e6e8ee;
    --code-bg: #f3f4f6;
    --code-fg: #111111;
  }
}

html,
body {
  padding: 0;
  margin: 0;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji",
    "Segoe UI Emoji";
  line-height: 1.6;
}

a {
  color: var(--link);
}

.container {
  max-width: 920px;
  margin: 0 auto;
  padding: 32px 20px;
}

header.site-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

header.site-header .site-title {
  margin: 0;
  font-size: 18px;
}

nav.site-nav a {
  margin-right: 12px;
  text-decoration: none;
}

main {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px;
}

h1,
h2,
h3 {
  line-height: 1.25;
}

pre,
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

pre {
  padding: 14px;
  overflow: auto;
  border-radius: 10px;
  background: var(--code-bg);
  border: 1px solid var(--border);
}

code {
  background: color-mix(in srgb, var(--code-bg), transparent 30%);
  padding: 0 6px;
  border-radius: 6px;
}

footer.site-footer {
  margin-top: 18px;
  color: var(--muted);
  font-size: 13px;
}
`

// If invoked directly (node dist/esm/ssg-cli.js ...), run minimal arg parsing.
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2)
  const getArgValue = (name: string): string | undefined => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }

  const inputDir = getArgValue('--in') ?? getArgValue('-i') ?? argv[0]
  const outputDir = getArgValue('--out') ?? getArgValue('-o') ?? argv[1]

  if (!inputDir || !outputDir) {
    // eslint-disable-next-line no-console
    console.error('Usage: relax-ssg <inputDir> <outputDir>')
    console.error('   or: relax-ssg --in <inputDir> --out <outputDir>')
    process.exit(1)
  }

  const baseUrl = process.env.RELAX_SSG_BASE_URL
  const cleanUrls = (process.env.RELAX_SSG_CLEAN_URLS as any) || 'always'
  const publicDir = process.env.RELAX_SSG_PUBLIC_DIR
  const siteName = process.env.RELAX_SSG_SITE_NAME
  const defaultLayout = process.env.RELAX_SSG_DEFAULT_LAYOUT
  const configPath = process.env.RELAX_SSG_CONFIG

  const opts: any = { inputDir, outputDir, cleanUrls }
  if (baseUrl) opts.baseUrl = baseUrl
  if (publicDir) opts.publicDir = publicDir
  if (siteName) opts.siteName = siteName
  if (defaultLayout) opts.defaultLayout = defaultLayout
  if (configPath) opts.configPath = configPath

  buildStaticSite(opts).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
}
