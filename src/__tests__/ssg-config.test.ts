import { describe, expect, it } from 'vitest'

import { mergeConfig } from '../ssg/config'

describe('ssg config', () => {
  it('mergeConfig prefers overrides and keeps base nav if override not provided', () => {
    const base = { siteName: 'A', nav: [{ label: 'Home', href: '/' }] }
    const merged = mergeConfig(base, { cleanUrls: 'never' })
    expect(merged.siteName).toBe('A')
    expect(merged.cleanUrls).toBe('never')
    expect(merged.nav?.length).toBe(1)
  })

  it('mergeConfig uses override nav when provided', () => {
    const base = { nav: [{ label: 'Home', href: '/' }] }
    const merged = mergeConfig(base, { nav: [{ label: 'Docs', href: '/docs/' }] })
    expect(merged.nav?.[0]?.href).toBe('/docs/')
  })
})
