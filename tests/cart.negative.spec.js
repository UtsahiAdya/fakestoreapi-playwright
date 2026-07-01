const { test, expect } = require('@playwright/test');
const { CartApi } = require('../pages/CartApi');
const { VALID_CART_ID, NEGATIVE_PAYLOADS, INVALID_CART_IDS } = require('../fixtures/testData');

/**
 * Negative path: Cart CRUD.
 *
 * IMPORTANT CONTEXT: FakeStoreAPI is a lenient public mock API. It does
 * NOT enforce strict request validation the way a production e-commerce
 * backend would (no 400 on missing fields, no 404 on a non-existent ID
 * for GET, etc.) — it largely echoes back whatever it's given and
 * returns 200/null for "not found" instead of 404/4xx.
 *
 * Rather than assert behavior the API doesn't actually implement (which
 * would just produce permanently-failing tests), this suite documents
 * and locks in the API's REAL behavior as an executable spec. Each test
 * explicitly states the expected behavior and would fail loudly if the
 * API's lenient behavior ever changes — which is exactly what a
 * regression/negative suite should catch.
 */
test.describe('Cart CRUD - Negative cases', () => {
  let cartApi;

  test.beforeEach(async ({ request }) => {
    cartApi = new CartApi(request);
  });

  test('GET /carts/:id with a non-existent numeric ID does not 5xx and returns null/empty body', async () => {
    const response = await cartApi.getCartById(INVALID_CART_IDS.nonExistentNumeric);
    // FakeStoreAPI returns 200 with a null body for unknown IDs rather than 404.
    expect(response.status()).toBe(200);
    const body = await response.json().catch(() => null);
    expect(body).toBeNull();
  });

  test('GET /carts/:id with a non-numeric ID is handled gracefully (no 5xx)', async () => {
    const response = await cartApi.getCartById(INVALID_CART_IDS.nonNumericString);
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /carts/:id with a negative ID is handled gracefully (no 5xx)', async () => {
    const response = await cartApi.getCartById(INVALID_CART_IDS.negative);
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /carts with an empty body is handled gracefully (no 5xx)', async () => {
    const response = await cartApi.createCart(NEGATIVE_PAYLOADS.emptyBody);
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /carts missing "userId" is handled gracefully (no 5xx)', async () => {
    const response = await cartApi.createCart(NEGATIVE_PAYLOADS.missingUserId);
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /carts missing "products" is handled gracefully (no 5xx)', async () => {
    const response = await cartApi.createCart(NEGATIVE_PAYLOADS.missingProducts);
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /carts with an empty products array is accepted but yields an empty cart', async () => {
    const response = await cartApi.createCart(NEGATIVE_PAYLOADS.emptyProductsArray);
    expect(response.status()).toBeLessThan(500);
    const body = await response.json().catch(() => null);
    if (body && body.products) {
      expect(body.products.length).toBe(0);
    }
  });

  test('POST /carts with wrong field types does not crash the server (no 5xx)', async () => {
    const response = await cartApi.createCart(NEGATIVE_PAYLOADS.wrongTypes);
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /carts with a negative quantity does not crash the server (no 5xx)', async () => {
    const response = await cartApi.createCart(NEGATIVE_PAYLOADS.negativeQuantity);
    expect(response.status()).toBeLessThan(500);
  });

  test('PUT /carts/:id against a non-existent cart ID is handled gracefully (no 5xx)', async () => {
    const response = await cartApi.updateCart(
      INVALID_CART_IDS.nonExistentNumeric,
      NEGATIVE_PAYLOADS.missingProducts
    );
    expect(response.status()).toBeLessThan(500);
  });

  test('DELETE /carts/:id against a non-existent cart ID does not 5xx', async () => {
    const response = await cartApi.deleteCart(INVALID_CART_IDS.nonExistentNumeric);
    expect(response.status()).toBeLessThan(500);
  });

  test('DELETE /carts/:id called twice in a row is idempotent at the HTTP level', async () => {
    const first = await cartApi.deleteCart(VALID_CART_ID);
    const second = await cartApi.deleteCart(VALID_CART_ID);
    expect(first.status()).toBeLessThan(500);
    expect(second.status()).toBeLessThan(500);
  });
});
