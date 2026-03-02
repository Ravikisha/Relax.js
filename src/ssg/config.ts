import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import vm from 'node:vm'

export type SsgNavItem = { label: string; href: string }

export type SsgConfig = {
  siteName?: string
  baseUrl?: string
  cleanUrls?: 'always' | 'never'
  defaultLayout?: string
  publicDir?: string
  nav?: SsgNavItem[]
}

export const DEFAULT_CONFIG: Required<Pick<SsgConfig, 'cleanUrls' | 'defaultLayout'>> = {
  cleanUrls: 'always',
  defaultLayout: 'default',
}

export async function loadSsgConfig(cwd: string, configPath?: string): Promise<{ path: string | null; config: SsgConfig }> {
  const abs = resolve(cwd, configPath ?? 'relax.ssg.config.js')

  // Fast check to avoid throwing on missing file.
  let code: string
  try {
    code = await readFile(abs, 'utf8')
  } catch {
    return { path: null, config: {} }
  }

  // Load as *data* without going through dynamic import (Vitest runs code through Vite,
  // which can fail for temp file paths). Keep it intentionally tiny: the config file is
  // expected to be a simple `export default { ... }` object literal.
  const sanitized = code.replace(/^\uFEFF/, '')
  const rewritten = sanitized.replace(/\bexport\s+default\b/, 'module.exports.default =')

  const sandbox: any = { module: { exports: {} }, exports: {} }
  vm.createContext(sandbox)
  vm.runInContext(rewritten, sandbox, { filename: abs })

  const config: SsgConfig = sandbox.module.exports?.default ?? sandbox.module.exports ?? {}
  return { path: abs, config }
}

export function mergeConfig(base: SsgConfig, overrides: SsgConfig): SsgConfig {
  const out: SsgConfig = {
    ...base,
    ...overrides,
  }
  const nav = overrides.nav ?? base.nav
  if (nav) out.nav = nav
  return out
}
