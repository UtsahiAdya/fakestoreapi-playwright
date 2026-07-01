// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for FakeStoreAPI Cart CRUD test suite.
 * This is an API-only suite (no browser UI), so we use the `request`
 * fixture exclusively. A single 'api' project keeps things fast; the
 * config is structured so UI projects could be added later without
 * any changes to the test files themselves.
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  // Fail the build on CI if test.only was left in the source.
  forbidOnly: !!process.env.CI,

  // Retries make the suite resilient to the odd flaky network blip
  // against a free public mock API.
  retries: process.env.CI ? 2 : 0,

  // Data-driven + independent CRUD specs are safe to run fully parallel
  // since FakeStoreAPI is a stateless mock (writes are not persisted).
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: 'https://fakestoreapi.com',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
