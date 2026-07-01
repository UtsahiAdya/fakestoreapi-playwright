/**
 * Centralized test data for the Cart CRUD suite.
 * Keeping data here (separate from test logic) is what makes the
 * suite "data-driven": adding a new product ID or invalid payload
 * means editing this file only — no test code changes required.
 */

/** Existing user IDs known to FakeStoreAPI's seed data (1-10). */
const VALID_USER_ID = 5;
const VALID_CART_ID = 1;

/**
 * Product IDs used by the data-driven test. FakeStoreAPI seeds 20
 * products (IDs 1-20), so all of these are guaranteed to exist.
 */
const DATA_DRIVEN_PRODUCT_IDS = [1, 2, 3, 5, 8];

/** A syntactically valid cart payload, parameterized by productId. */
function buildCartPayload({
  userId = VALID_USER_ID,
  productId,
  quantity = 2,
  date = new Date().toISOString(),
} = {}) {
  return {
    userId,
    date,
    products: [{ productId, quantity }],
  };
}

/**
 * Deliberately fake credentials for the negative auth case — these
 * should never match a real account, by construction.
 *
 * NOTE: there is intentionally no hardcoded "VALID_CREDENTIALS" here.
 * Valid login credentials are fetched live from GET /users at test
 * time (see tests/cart.auth.spec.js + pages/UsersApi.js) so the auth
 * suite stays correct even if FakeStoreAPI's seeded accounts change.
 */
const INVALID_CREDENTIALS = {
  username: 'not_a_real_user_xyz',
  password: 'wrong-password',
};

/** Malformed / boundary payloads for negative testing. */
const NEGATIVE_PAYLOADS = {
  missingUserId: {
    date: new Date().toISOString(),
    products: [{ productId: 1, quantity: 1 }],
  },
  missingProducts: {
    userId: VALID_USER_ID,
    date: new Date().toISOString(),
  },
  emptyProductsArray: {
    userId: VALID_USER_ID,
    date: new Date().toISOString(),
    products: [],
  },
  wrongTypes: {
    userId: 'not-a-number',
    date: new Date().toISOString(),
    products: 'not-an-array',
  },
  negativeQuantity: {
    userId: VALID_USER_ID,
    date: new Date().toISOString(),
    products: [{ productId: 1, quantity: -5 }],
  },
  emptyBody: {},
};

/** IDs that should not exist / are malformed, for negative GET/PUT/DELETE. */
const INVALID_CART_IDS = {
  nonExistentNumeric: 999999,
  nonNumericString: 'abc',
  negative: -1,
  zero: 0,
};

/**
 * Query-param fixtures for GET /carts, per the documented options:
 *   /carts?limit=5
 *   /carts?sort=desc|asc
 *   /carts?startdate=...&enddate=...
 *   /carts/user/1?startdate=...&enddate=...
 */
const QUERY_PARAMS = {
  limit: 5,
  sort: { asc: 'asc', desc: 'desc' },
  // Wide range guaranteed to include all seeded carts (FakeStoreAPI's
  // seed cart dates fall in 2019-2020).
  wideDateRange: { startdate: '2019-01-01', enddate: '2023-12-31' },
  // Narrow/out-of-range window guaranteed to exclude all seeded carts,
  // used to prove date filtering actually has an effect.
  noMatchDateRange: { startdate: '1999-01-01', enddate: '1999-01-02' },
};

module.exports = {
  VALID_USER_ID,
  VALID_CART_ID,
  DATA_DRIVEN_PRODUCT_IDS,
  buildCartPayload,
  INVALID_CREDENTIALS,
  NEGATIVE_PAYLOADS,
  INVALID_CART_IDS,
  QUERY_PARAMS,
};
