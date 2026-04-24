import { defineConfig } from '@playwright/test'
import process from 'node:process'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
})
