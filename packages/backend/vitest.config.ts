import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@planning/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
})


