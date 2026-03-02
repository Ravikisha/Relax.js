import { describe, expect, it } from 'vitest'

import { h } from '../h'
import { markdownToPage } from '../ssg/markdown'
import { renderToString } from '../ssg/render-to-string'
import { renderSitemapXml, toOutputPath, toUrlFromOutPath } from '../ssg/site'

describe('ssg', () => {
    it('parses YAML-ish frontmatter (flat key/value)', async () => {
        const md = `---
title: Hello World
description: "A test"
draft: false
count: 42
---

# Hi`

        const res = await markdownToPage(md, { frontmatter: true })
        expect(res.data.title).toBe('Hello World')
        expect(res.data.description).toBe('A test')
        expect(res.data.draft).toBe(false)
        expect(res.data.count).toBe(42)
    })

    it('frontmatter parser ignores non key/value lines and handles BOM', async () => {
        const md = `\ufeff---
title: Test
not-a-pair
num: -1
---

Hello`
        const res = await markdownToPage(md, { frontmatter: true })
        expect(res.data.title).toBe('Test')
        expect(res.data.num).toBe(-1)
        expect(res.data['not-a-pair']).toBeUndefined()
    })

    it('renders innerHTML without escaping (intended for markdown)', () => {
        const vdom = h('div', { innerHTML: '<span>ok</span>' })
        expect(renderToString(vdom)).toBe('<div><span>ok</span></div>')
    })

    it('escapes text nodes by default', () => {
        // ensure ordinary text is escaped
        const vdom = h('p', {}, ['<script>'])
        expect(renderToString(vdom)).toBe('<p>&lt;script&gt;</p>')
    })

    it('maps markdown paths to clean URLs', () => {
        expect(toOutputPath('index.md', 'always')).toBe('index.html')
        expect(toOutputPath('about.md', 'always')).toBe('about/index.html')
        expect(toOutputPath('docs/intro.md', 'always')).toBe('docs/intro/index.html')
        expect(toOutputPath('docs/index.md', 'always')).toBe('docs/index.html')

        expect(toOutputPath('about.md', 'never')).toBe('about.html')

        expect(toUrlFromOutPath('about/index.html')).toBe('/about/')
        expect(toUrlFromOutPath('docs/intro/index.html')).toBe('/docs/intro/')
        expect(toUrlFromOutPath('index.html')).toBe('/')
    })

    it('renders sitemap.xml', () => {
        const xml = renderSitemapXml('https://example.com', [{ loc: '/' }, { loc: '/about/' }])
        expect(xml.includes('<urlset')).toBe(true)
        expect(xml.includes('https://example.com/')).toBe(true)
        expect(xml.includes('https://example.com/about/')).toBe(true)
    })
})
