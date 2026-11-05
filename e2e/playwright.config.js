const { defineConfig, devices } = require('@playwright/test');

// Point the suite at any deployment, e.g. BASE_URL=https://bstackdemo.com
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isRemote = !/localhost|127\.0\.0\.1/.test(baseURL);

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: { timeout: 15 * 1000 },
  fullyParallel: true,
  retries: isRemote ? 2 : 0,
  workers: isRemote ? 4 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/../visual-baseline/{arg}{ext}',
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'functional',
      testIgnore: /visual\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
