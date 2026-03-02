import { afterEach, describe, expect, it } from 'vitest'

import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildStaticSite } from '../ssg/cli'

describe('ssg (integration)', () => {
  let dir: string | null = null

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
    dir = null
  })

  it('builds html files, public assets, theme, and sitemap', async () => {
    dir = await mkdtemp(join(tmpdir(), 'relax-ssg-'))
    const inputDir = join(dir, 'in')
    const outputDir = join(dir, 'out')

    // Write a local config into the temp CWD so buildStaticSite picks it up.
    // This test doubles as a proof that config-driven nav renders into HTML.
    await writeFile(
      join(dir, 'relax.ssg.config.js'),
      `export default {\n  nav: [\n    { label: 'Home', href: '/' },\n    { label: 'Docs', href: '/docs/' },\n  ],\n}\n`,
      'utf8'
    )

    await mkdir(join(inputDir, 'public'), { recursive: true })
    await writeFile(join(inputDir, 'public', 'robots.txt'), 'ok', 'utf8')

    await writeFile(
      join(inputDir, 'index.md'),
      `---\ntitle: Home\n---\n\n# Hello`,
      'utf8'
    )
    await writeFile(
      join(inputDir, 'about.md'),
      `---\ntitle: About\n---\n\n# About`,
      'utf8'
    )

    const prevCwd = process.cwd()
    try {
      process.chdir(dir)
      await buildStaticSite({
        inputDir,
        outputDir,
        baseUrl: 'https://example.com',
        cleanUrls: 'always',
        siteName: 'My Site',
      })
    } finally {
      process.chdir(prevCwd)
    }

    const indexHtml = await readFile(join(outputDir, 'index.html'), 'utf8')
    expect(indexHtml).toContain('<title>Home</title>')
    expect(indexHtml).toContain('My Site')
    expect(indexHtml).toContain('<h1>Hello')
  expect(indexHtml).toContain('<nav')
  expect(indexHtml).toContain('Docs')

    const aboutHtml = await readFile(join(outputDir, 'about', 'index.html'), 'utf8')
    expect(aboutHtml).toContain('<title>About</title>')

    const themeCss = await readFile(join(outputDir, 'theme', 'default.css'), 'utf8')
    expect(themeCss).toContain('Relax.js SSG default theme')

    const robots = await readFile(join(outputDir, 'robots.txt'), 'utf8')
    expect(robots).toBe('ok')

    const sitemap = await readFile(join(outputDir, 'sitemap.xml'), 'utf8')
    expect(sitemap).toContain('https://example.com/')
    expect(sitemap).toContain('https://example.com/about/')
  })
})
