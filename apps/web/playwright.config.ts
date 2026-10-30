import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: './test-results/lifecycle-walkthrough',
  use: {
    baseURL: 'http://localhost:3105',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1440, height: 900 },
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
  webServer: {
    command: 'npx next dev -p 3105',
    url: 'http://localhost:3105/login',
    reuseExistingServer: true,
    timeout: 90_000,
  },
});

