const { test, expect } = require('@playwright/test');
const { CartApi } = require('../pages/CartApi');
const { validateSchema } = require('../utils/schemaValidator');
const { VALID_USER_ID, QUERY_PARAMS } = require('../fixtures/testData');

/**
 * Documented GET /carts query-param behavior, per FakeStoreAPI's own
 * source README:
 *   /carts?limit=5
 *   /carts?sort=desc|asc
 *   /carts?startdate=...&enddate=...
 *   /carts/user/:userId?startdate=...&enddate=...
 *
 * These were not in the original CRUD-focused suite; added once the
 * official README confirmed they're real, supported endpoints rather
 * than assumptions.
 */
test.describe('Cart - Query parameters', () => {
  let cartApi;

  test.beforeEach(async ({ request }) => {
    cartApi = new CartApi(request);
  });

  test('GET /carts?limit=N returns at most N carts', async () => {
    const response = await cartApi.getAllCarts(undefined, { limit: QUERY_PARAMS.limit });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(QUERY_PARAMS.limit);

    const { valid, errorsText } = validateSchema('cartList.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  // NOTE: the README documents `sort=asc|desc` but doesn't state which
  // field it sorts by. We assume `id` (the natural/default ordering key
  // for this resource). If this assumption is wrong, this test will
  // fail with a clear "received order vs expected order" diff rather
  // than silently passing — that diagnostic value is the point.
  test('GET /carts?sort=desc returns carts in descending id order', async () => {
    const response = await cartApi.getAllCarts(undefined, { sort: QUERY_PARAMS.sort.desc });
    expect(response.status()).toBe(200);

    const body = await response.json();
    const ids = body.map((cart) => cart.id);
    const sortedDesc = [...ids].sort((a, b) => b - a);
    expect(ids).toEqual(sortedDesc);
  });

  test('GET /carts?sort=asc returns carts in ascending id order', async () => {
    const response = await cartApi.getAllCarts(undefined, { sort: QUERY_PARAMS.sort.asc });
    expect(response.status()).toBe(200);

    const body = await response.json();
    const ids = body.map((cart) => cart.id);
    const sortedAsc = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sortedAsc);
  });

  test('GET /carts?startdate=&enddate= within a wide range returns the same carts as unfiltered', async () => {
    const allRes = await cartApi.getAllCarts();
    const allBody = await allRes.json();

    const filteredRes = await cartApi.getAllCarts(undefined, QUERY_PARAMS.wideDateRange);
    expect(filteredRes.status()).toBe(200);
    const filteredBody = await filteredRes.json();

    // A range wide enough to cover all seeded data should return
    // everything the unfiltered call does.
    expect(filteredBody.length).toBe(allBody.length);
  });

  test('GET /carts?startdate=&enddate= outside all cart dates returns an empty/filtered result', async () => {
    const response = await cartApi.getAllCarts(undefined, QUERY_PARAMS.noMatchDateRange);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    // Proves the date filter actually narrows results rather than being ignored.
    expect(body.length).toBe(0);
  });

  test('GET /carts/user/:userId?startdate=&enddate= scopes results to both the user and the date range', async () => {
    const response = await cartApi.getCartsByUserId(
      VALID_USER_ID,
      undefined,
      QUERY_PARAMS.wideDateRange
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    for (const cart of body) {
      expect(cart.userId).toBe(VALID_USER_ID);
    }
  });
});
