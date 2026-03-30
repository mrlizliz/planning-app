import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @planning/backend dev',
      port: 3001,
      timeout: 10000,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm --filter @planning/frontend dev',
      port: 5173,
      timeout: 10000,
      reuseExistingServer: true,
    },
  ],
})

