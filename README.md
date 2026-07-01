# FakeStoreAPI — Cart CRUD Test Suite

API test suite for `https://fakestoreapi.com` Cart CRUD (`POST` / `GET` / `PUT` / `DELETE`), built with **Playwright Test (JS)** using an **API Page-Object pattern** and **data-driven tests**.

## Framework choice + why

**Playwright Test**, used purely through its `request` (`APIRequestContext`) fixture — no browser needed for pure REST testing.

- **One tool, one config, one report.** Built-in test runner, assertions (`expect`), parallelization, retries, tracing, and HTML/JSON/JUnit reporters out of the box — no gluing together Mocha + Chai + Supertest + a separate reporter.
- **First-class API testing.** `request.get/post/put/delete()` gives full control over headers, JSON bodies, and raw status codes without a browser context, while still letting the same project add UI/E2E specs later (e.g. testing the cart against a real storefront UI) using the *same* config, fixtures, and CI pipeline.
- **Parallel by default, fast by default.** Tests run in isolated workers with no shared state — ideal for a stateless mock API like FakeStoreAPI.
- **Built-in tracing & retries.** `trace: 'retain-on-failure'` gives a full request/response trace for any CI failure with zero extra setup — important against a third-party API outside our control.
- **TypeScript-ready without TypeScript tax.** Plain JS today; flipping to `.ts` later is a config flag, not a rewrite.

### Design decisions
- **Page Object → "API Object".** `pages/CartApi.js`, `AuthApi.js`, `ProductsApi.js` wrap every endpoint. Tests never call `request.get(...)` directly — they call `cartApi.getCartById(1)`. One file to update if a path changes.
- **Data-driven via plain data, not a DSL.** `fixtures/testData.js` is the single source of truth for product IDs, payloads, and credentials. `tests/cart.dataDriven.spec.js` loops `DATA_DRIVEN_PRODUCT_IDS` (5 IDs, exceeds the 3+ requirement) generating one named test per ID — failures point at the exact ID that broke.
- **Schema/contract testing via Ajv**, not snapshot-diffing raw JSON (which is brittle against a mock API that fabricates IDs/timestamps each run). `utils/schemaValidator.js` validates structure + types; `fixtures/schemas/cart.contract-snapshot.json` additionally locks the exact key set so a silently added/removed/renamed field fails loudly (bonus requirement). The cart shape (`id, userId, date, products:[{productId, quantity}]`) is confirmed directly against [FakeStoreAPI's own source README](https://github.com/keikaavousi/fake-store-api), not inferred from third-party usage.
- **No hardcoded login credentials.** The Authentication suite fetches a real, currently-seeded user from `GET /users` at test time (`pages/UsersApi.js` + `fetchLiveCredentials()` in `cart.auth.spec.js`) and logs in with that user's actual `username`/`password`, rather than relying on a specific demo account that could be rotated, reset, or deleted upstream. This was a deliberate revision after the original hardcoded demo credentials worked but couldn't be verified against any authoritative source.
- **Negative tests assert real behavior, not idealized behavior.** FakeStoreAPI is a lenient mock (no 404 on unknown cart ID, no 400 on missing fields). The negative suite documents and locks in *actual* current behavior so it acts as a regression tripwire if that behavior ever tightens.

## Suite layout
```
.github/workflows/  CI workflow (playwright.yml) — runs the suite on push/PR/schedule
pages/        API Page Objects (CartApi, AuthApi, ProductsApi, BaseApi)
fixtures/     Test data + JSON schemas + contract snapshot
tests/        cart.positive / .negative / .auth / .schema / .dataDriven / .queryParams
utils/        Ajv schema validator
```

## Continuous Integration
`.github/workflows/playwright.yml` runs the full suite automatically:
- **On every push and pull request** to `main`/`master`.
- **On a daily schedule** (06:00 UTC) — since this suite tests a third-party public API we don't control, a nightly run catches upstream drift (e.g. a status code or schema change) even on days with no code changes.
- **On manual dispatch** from the Actions tab.

Each run installs dependencies, executes `npx playwright test`, and uploads the HTML report + JUnit/JSON results as build artifacts (14-day retention) so failures can be triaged without re-running locally. A JUnit-based test-reporter step also publishes pass/fail counts directly on the commit/PR checks page.

## Running
```bash
npm install
npx playwright install      # not strictly needed for API-only tests, but keeps the option open for UI specs
npm test                    # all specs
npm run test:data-driven    # just the data-driven suite
npm run report               # open the last HTML report
```

## Extension plan

**Parallelization**
- Already `fullyParallel: true` with worker count driven by `CI` env var, and already wired into GitHub Actions (`.github/workflows/playwright.yml`). Next step: shard across CI runners with `--shard=1/4` etc. in a matrix job, merging blob reports via `playwright merge-reports`.
- Tag slow/flaky-prone specs (`@smoke`, `@regression`) with `test.describe('...', { tag: '@smoke' })` to run a fast subset on every PR and the full suite nightly (the workflow already has a daily cron slot this could split into).

**Reporting**
- HTML + JSON + JUnit reporters are already wired up (`junit.xml` for CI test-result ingestion) and already published as GitHub Actions artifacts on every run, with a JUnit-based check-page summary via `dorny/test-reporter`.
- Next step: pipe JSON results into a trend dashboard (e.g. Allure, or a simple GitHub Pages publish of `playwright-report/`) for tracking pass-rate over time, not just per-run.
- Add Slack/Teams webhook notification on `main`-branch failures via a custom reporter or CI step reading `test-results/results.json`.

**Other growth areas**
- Add a `users` and `products` CRUD suite reusing the same Page-Object/data-driven pattern.
- Promote `cart.contract-snapshot.json` into a CI gate that fails the build (separate from functional tests) so contract breaks are triaged distinctly from flaky-test noise.
- Add an OpenAPI-spec-based contract test (Ajv can compile directly from an OpenAPI schema) once/if FakeStoreAPI publishes one, replacing the hand-captured snapshot.
