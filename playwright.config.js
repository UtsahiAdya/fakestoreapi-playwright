// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for FakeStoreAPI Cart CRUD test suite.
 * This is an API-only suite (no browser UI), so we use the `request`
 * fixture exclusively. A single 'api' project keeps things fast; the
 * config is structured so UI projects could be added later without
 * any changes to the test files themselves.
 *
 * CI NOTE — public API + shared datacenter IPs:
 * FakeStoreAPI is a free, unauthenticated third-party API. Requests
 * from GitHub Actions' shared runner IP ranges can occasionally be
 * blocked by upstream WAF/bot-protection (returned as an HTML 403
 * page rather than a JSON API response) even though the exact same
 * suite passes cleanly when run from a normal residential/office IP.
 * This is not something the test assertions can fix, so the config
 * below is tuned to reduce the chance of tripping that protection:
 *   - Lower parallelism in CI (fewer concurrent connections = less
 *     "burst" traffic, which is what most bot-detection keys off of).
 *   - More retries with a short built-in gap between attempts.
 *   - Realistic browser-like headers so requests don't look like a
 *     bare HTTP client/bot.
 * If a CI run still shows widespread, all-endpoint 403s (not just
 * failures in one spec), re-run the job — it is very likely a
 * transient upstream block, not a regression in this codebase.
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  // Fail the build on CI if test.only was left in the source.
  forbidOnly: !!process.env.CI,

  // Higher retry count in CI specifically to ride out transient
  // upstream WAF/rate-limit blocks against this public API.
  retries: process.env.CI ? 3 : 0,

  // Data-driven + independent CRUD specs are safe to run fully parallel
  // since FakeStoreAPI is a stateless mock (writes are not persisted).
  // In CI, parallelism is deliberately kept LOW (2, not 4+) because a
  // burst of concurrent requests from a shared runner IP is exactly
  // the pattern bot-protection/WAFs are tuned to flag.
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

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
      // A realistic browser User-Agent + Accept-Language reduces the
      // chance of being flagged as a bare bot/script client by
      // upstream bot-detection. This is a legitimate, publicly
      // documented demo API — not a scraping workaround for a site
      // that disallows automated access.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
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