import { defineConfig } from 'vitest/config'

import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'relax-jsx': `${rootDir}/relax-jsx`,
    },
  },
  test: {
  include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    reporters: 'verbose',
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
    },
  },
})
