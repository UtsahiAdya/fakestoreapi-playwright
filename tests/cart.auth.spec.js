const { test, expect } = require('@playwright/test');
const { AuthApi } = require('../pages/AuthApi');
const { CartApi } = require('../pages/CartApi');
const { UsersApi } = require('../pages/UsersApi');
const { validateSchema } = require('../utils/schemaValidator');
const { INVALID_CREDENTIALS, VALID_CART_ID } = require('../fixtures/testData');

/**
 * Authentication suite.
 *
 * Covers:
 *  - Successful login returns a well-formed JWT-shaped token.
 *  - Invalid credentials are rejected.
 *  - Missing credentials are rejected / handled gracefully.
 *  - Cart endpoints are exercised both WITH and WITHOUT a bearer token,
 *    documenting that FakeStoreAPI's cart endpoints do not currently
 *    enforce auth (a real finding worth flagging to an API owner) while
 *    still proving the token can be successfully attached end-to-end.
 *
 * IMPORTANT — credential sourcing:
 * "Valid" login credentials are NOT hardcoded. They're fetched live
 * from GET /users at test time via `fetchLiveCredentials()` below, and
 * the real `username`/`password` of a currently-seeded user is used to
 * log in. This keeps the suite correct even if FakeStoreAPI's demo
 * accounts get rotated, reset, or deleted — the test is asserting
 * "login works for a real seeded account", not "this one account I
 * copy-pasted still exists".
 */

/**
 * Fetches the full user list and returns the username/password of the
 * first seeded user. Per FakeStoreAPI's own source README, /users
 * returns plaintext password fields for demo purposes.
  
 */
async function fetchLiveCredentials(usersApi) {
  const usersRes = await usersApi.getAllUsers();
  expect(usersRes.status(), 'GET /users must succeed to source live login credentials').toBe(200);

  const users = await usersRes.json();
  expect(Array.isArray(users) && users.length > 0, 'GET /users returned no seeded users').toBe(
    true
  );

  const [user] = users;
  expect(user, 'First seeded user is missing username/password').toMatchObject({
    username: expect.any(String),
    password: expect.any(String),
  });

  return { username: user.username, password: user.password };
}

test.describe('Authentication', () => {
  let authApi;
  let usersApi;

  test.beforeEach(async ({ request }) => {
    authApi = new AuthApi(request);
    usersApi = new UsersApi(request);
  });

  test('POST /auth/login with a live, currently-seeded user returns a token', async () => {
    const credentials = await fetchLiveCredentials(usersApi);

    const response = await authApi.login(credentials);
    // FakeStoreAPI responds 201 (resource/token created) rather than 200.
    expect([200, 201]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(10);

    const { valid, errorsText } = validateSchema('authLogin.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('POST /auth/login with invalid credentials is rejected', async () => {
    const response = await authApi.login(INVALID_CREDENTIALS);
    // FakeStoreAPI returns 401 for bad credentials.
    expect(response.status()).toBe(401);
  });

  test('POST /auth/login with an empty body does not 5xx', async () => {
    const response = await authApi.login({});
    expect(response.status()).toBeLessThan(500);
    expect(response.status()).not.toBe(200);
  });

  test('POST /auth/login with only a username (missing password) is rejected', async () => {
    const credentials = await fetchLiveCredentials(usersApi);
    const response = await authApi.login({ username: credentials.username });
    expect(response.status()).toBeLessThan(500);
    expect(response.status()).not.toBe(200);
  });

  test('Token from a live login can be attached to a Cart request', async ({ request }) => {
    const credentials = await fetchLiveCredentials(usersApi);

    const loginRes = await authApi.login(credentials);
    expect([200, 201]).toContain(loginRes.status());
    const { token } = await loginRes.json();

    const cartApi = new CartApi(request);
    const cartRes = await cartApi.getCartById(VALID_CART_ID, token);
    expect(cartRes.status()).toBe(200);
  });

  test('Cart endpoints currently respond the same with or without a bearer token', async ({ request }) => {
    // This documents the API's real current behavior: cart endpoints are
    // not gated behind auth. If FakeStoreAPI starts enforcing auth, this
    // test will start failing and should be updated to assert a 401
    // for the no-token case — that's the intended "tripwire" value here.
    const cartApi = new CartApi(request);

    const withoutToken = await cartApi.getCartById(VALID_CART_ID);
    const withInvalidToken = await cartApi.getCartById(VALID_CART_ID, 'this.is.not.a.valid.jwt');

    expect(withoutToken.status()).toBe(200);
    expect(withInvalidToken.status()).toBe(200);
  });
});
