# FakeStoreAPI — Cart CRUD Test Suite

API test suite for `https://fakestoreapi.com` Cart CRUD (`POST` / `GET` / `PUT` / `DELETE`), built with **Playwright Test (JS)** using an **API Page-Object pattern** and **data-driven tests**.

## Framework choice + why

**Playwright Test**, used purely through its `request` (`APIRequestContext`) fixture — no browser needed for pure REST testing.

- **One tool, one config, one report.** Built-in test runner, assertions (`expect`), parallelization, retries, tracing, and HTML/JSON/JUnit reporters out of the box — no gluing together Mocha + Chai + Supertest + a separate reporter.
- **First-class API testing.** `request.get/post/put/delete()` gives full control over headers, JSON bodies, and raw status codes without a browser context, while still letting the same project add UI/E2E specs later (e.g. testing the cart against a real storefront UI) using the *same* config and fixtures.
- **Parallel by default, fast by default.** Tests run in isolated workers with no shared state — ideal for a stateless mock API like FakeStoreAPI.
- **Built-in tracing & retries.** `trace: 'retain-on-failure'` gives a full request/response trace for any failure with zero extra setup — important against a third-party API outside our control.
- **TypeScript-ready without TypeScript tax.** Plain JS today; flipping to `.ts` later is a config flag, not a rewrite.

### Design decisions
- **Page Object → "API Object".** `pages/CartApi.js`, `AuthApi.js`, `ProductsApi.js`, `UsersApi.js` wrap every endpoint. Tests never call `request.get(...)` directly — they call `cartApi.getCartById(1)`. One file to update if a path changes.
- **Environment config separated from Playwright project config.** `config/env.js` owns everything specific to the target environment — base URL, default headers, timeouts — keyed by `TEST_ENV` (defaults to `production`). `playwright.config.js` only contains Playwright's own runner behavior (test discovery, retries, parallelism, reporters) and imports `envConfig` from `config/env.js` rather than hardcoding environment details. Adding a second environment (e.g. `staging`) means adding one key to `config/env.js` — no changes to `playwright.config.js` or any test file.
- **Data-driven via plain data, not a DSL.** `fixtures/testData.js` is the single source of truth for product IDs, payloads, and credentials. `tests/cart.dataDriven.spec.js` loops `DATA_DRIVEN_PRODUCT_IDS` (5 IDs, exceeds the 3+ requirement) generating one named test per ID — failures point at the exact ID that broke.
- **Schema/contract testing via Ajv**, not snapshot-diffing raw JSON (which is brittle against a mock API that fabricates IDs/timestamps each run). `utils/schemaValidator.js` validates structure + types; `fixtures/schemas/cart.contract-snapshot.json` additionally locks the exact key set so a silently added/removed/renamed field fails loudly (bonus requirement). The cart shape (`id, userId, date, products:[{productId, quantity}]`) is confirmed directly against [FakeStoreAPI's own source README](https://github.com/keikaavousi/fake-store-api), not inferred from third-party usage.
- **No hardcoded login credentials.** The Authentication suite fetches a real, currently-seeded user from `GET /users` at test time (`pages/UsersApi.js` + `fetchLiveCredentials()` in `cart.auth.spec.js`) and logs in with that user's actual `username`/`password`, rather than relying on a specific demo account that could be rotated, reset, or deleted upstream.
- **Negative tests assert real behavior, not idealized behavior.** FakeStoreAPI is a lenient mock (no 404 on unknown cart ID, no 400 on missing fields). The negative suite documents and locks in *actual* current behavior so it acts as a regression tripwire if that behavior ever tightens.

## Suite layout
## Running
```bash
npm install
npx playwright install      # not strictly needed for API-only tests, but keeps the option open for UI specs
npm test                    # all specs
npm run test:data-driven    # just the data-driven suite
npm run report               # open the last HTML report

# Optional: target a different environment (see config/env.js)
TEST_ENV=staging npx playwright test
```

## Known limitation — public API + datacenter/cloud IPs

FakeStoreAPI is a free, unauthenticated third-party API with no SLA. During development, a run from a shared cloud/datacenter IP (e.g. a CI runner) came back with **403 on every single request across every spec file — including all retries**, with the response body being raw HTML (`<!DOCTYPE ...>`) instead of JSON.

**Root cause:** because *every* retry failed identically (not just the first attempt cooling off), this is very likely a **static IP-range block** from an upstream WAF against shared/datacenter IP ranges, not adaptive rate-limiting. Lowering concurrency, adding retries, or spoofing a browser `User-Agent` does **not** fix a static block — those techniques only help against *behavioral* bot-detection.

**How to tell this apart from a real regression, if you ever see a similar failure pattern:**
- **Upstream/network block:** *every* endpoint fails at once regardless of what changed, every retry fails identically, and the response body is HTML.
- **Real regression:** a small, specific set of tests fail with a JSON error body and a status code that makes semantic sense for that request.

**Practical implication:** this suite runs reliably from a normal residential/office network (confirmed locally). If you later run it from any shared cloud/datacenter environment (a VPS, a CI runner, etc.) and see the failure pattern above, it is very likely this same upstream block rather than a code issue.

## Extension plan

**CI/CD**
- No CI pipeline is currently configured in this repo. If added back, be aware of the "Known limitation" above — GitHub-hosted (and most cloud) CI runners use shared/datacenter IPs that may be blocked by FakeStoreAPI's upstream WAF regardless of retry/header tuning. A workable pattern: keep the live suite as a manually-triggered or self-hosted-runner job, and consider mocking/recording responses (e.g. via Playwright route interception) for a fast, deterministic job that runs on every push without depending on the live third-party API.

**Parallelization**
- Already `fullyParallel: true` with worker count driven by the `CI` env var, ready to wire into any CI system. Next step if CI is added: shard across runners with `--shard=1/4` etc. in a matrix job, merging blob reports via `playwright merge-reports`.
- Tag slow/flaky-prone specs (`@smoke`, `@regression`) with `test.describe('...', { tag: '@smoke' })` to run a fast subset on demand and the full suite on a schedule.

**Reporting**
- HTML + JSON + JUnit reporters are already wired up (`junit.xml` is ready for ingestion by any CI system's test-result reporting).
- Next step: pipe JSON results into a trend dashboard (e.g. Allure, or a simple static-site publish of `playwright-report/`) for tracking pass-rate over time, not just per-run.
- Add Slack/Teams webhook notification on failures via a custom reporter or a script reading `test-results/results.json`.

**Other growth areas**
- Add a `users` and `products` CRUD suite reusing the same Page-Object/data-driven pattern.
- Promote `cart.contract-snapshot.json` into a dedicated contract-check step (separate from functional tests) so contract breaks are triaged distinctly from flaky-test noise.
- Add an OpenAPI-spec-based contract test (Ajv can compile directly from an OpenAPI schema) once/if FakeStoreAPI publishes one, replacing the hand-captured snapshot.
- Add a `config/env.js` `staging` (or `local`) entry if a non-production target ever becomes available for this API.
