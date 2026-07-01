 // @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { envConfig } = require('./config/env');

/**
 * Playwright PROJECT configuration for the Cart CRUD test suite.
 *
 * This file intentionally contains ONLY Playwright's own runner
 * behavior: test discovery, timeouts wiring, retries, parallelism,
 * and reporters. Anything specific to the target environment (base
 * URL, headers, per-environment timeouts) lives in config/env.js and
 * is imported here via `envConfig` - keeping "what to test against"
 * separate from "how the test runner behaves".
 *
 * This is an API-only suite (no browser UI), so we use the `request`
 * fixture exclusively. A single 'api' project keeps things fast; the
 * config is structured so UI projects could be added later without
 * any changes to the test files themselves.
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: envConfig.timeout,
  expect: {
    timeout: envConfig.expectTimeout,
  },

  // Fail the build on CI if test.only was left in the source.
  forbidOnly: !!process.env.CI,

  // One retry helps with genuinely transient network blips.
  retries: process.env.CI ? 1 : 0,

  // Data-driven + independent CRUD specs are safe to run fully parallel
  // since FakeStoreAPI is a stateless mock (writes are not persisted).
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: envConfig.baseURL,
    extraHTTPHeaders: envConfig.headers,
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});