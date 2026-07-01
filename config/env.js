/**
 * Environment configuration for the Cart CRUD test suite.
 *
 * Anything that changes per TARGET ENVIRONMENT (base URL, default
 * headers, timeouts) lives here, so playwright.config.js can stay
 * focused purely on Playwright's own project/runner configuration
 * (test discovery, retries, parallelism, reporters).
 *
 * To point the suite at a different environment, set TEST_ENV before
 * running tests, e.g.:
 *   TEST_ENV=staging npx playwright test
 * Defaults to "production" (the live public FakeStoreAPI) when unset.
 *
 * NOTE on headers: FakeStoreAPI is a free, unauthenticated public API
 * with no SLA. A realistic browser User-Agent + Accept-Language is
 * set below because bare/default HTTP-client headers are more likely
 * to be flagged by generic bot-detection on any third-party service.
 * This does not guarantee access from every network (some hosting/
 * datacenter IP ranges may still be blocked at the infrastructure
 * level regardless of headers) - it's a reasonable default for
 * requests made from a normal residential/office connection.
 */

const environments = {
  production: {
    baseURL: 'https://fakestoreapi.com',
    timeout: 30 * 1000,
    expectTimeout: 10 * 1000,
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Add additional environments here as needed, e.g.:
  // staging: {
  //   baseURL: 'https://staging.fakestoreapi.com',
  //   timeout: 30 * 1000,
  //   expectTimeout: 10 * 1000,
  //   headers: { Accept: 'application/json' },
  // },
};

const activeEnv = process.env.TEST_ENV || 'production';
const envConfig = environments[activeEnv];

if (!envConfig) {
  throw new Error(
    `Unknown TEST_ENV "${activeEnv}". Available environments: ${Object.keys(environments).join(', ')}`
  );
}

module.exports = { envConfig, activeEnv, environments };