import { defineConfig } from '@playwright/test';

const webUrl = process.env.WEB_URL ?? 'http://localhost:8081';

export default defineConfig({
  testDir: './tests',
  testMatch: 'demo-walkthrough.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: webUrl,
    headless: process.env.DEMO_HEADLESS === '1',
    launchOptions: {
      slowMo: Number(process.env.DEMO_SLOW_MS ?? 400),
    },
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
});
