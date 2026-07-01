const { test, expect } = require('@playwright/test');
const { CartApi } = require('../pages/CartApi');
const { validateSchema } = require('../utils/schemaValidator');
const {
  VALID_USER_ID,
  VALID_CART_ID,
  buildCartPayload,
} = require('../fixtures/testData');

/**
 * Positive path: Cart CRUD (POST / GET / PUT / DELETE).
 * Confirms the "happy path" contract of each endpoint: status code,
 * presence of expected fields, and correct echoing of submitted data.
 *
 * Note: FakeStoreAPI is a stateless mock — POST/PUT/DELETE responses
 * are well-formed but not actually persisted server-side. These tests
 * therefore validate the *response contract* of each call rather than
 * cross-request persistence.
 */
test.describe('Cart CRUD - Positive cases', () => {
  let cartApi;

  test.beforeEach(async ({ request }) => {
    cartApi = new CartApi(request);
  });

  test('GET /carts returns a non-empty list of carts', async () => {
    const response = await cartApi.getAllCarts();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const { valid, errorsText } = validateSchema('cartList.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('GET /carts/:id returns a single cart matching the schema', async () => {
    const response = await cartApi.getCartById(VALID_CART_ID);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(VALID_CART_ID);
    expect(body).toHaveProperty('userId');
    expect(body).toHaveProperty('products');

    const { valid, errorsText } = validateSchema('cart.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('GET /carts/user/:userId returns carts for that user', async () => {
    const response = await cartApi.getCartsByUserId(VALID_USER_ID);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    for (const cart of body) {
      expect(cart.userId).toBe(VALID_USER_ID);
    }
  });

  test('POST /carts creates a cart and echoes submitted data', async () => {
    const payload = buildCartPayload({ productId: 1, quantity: 3 });
    const response = await cartApi.createCart(payload);

    expect([200, 201]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.userId).toBe(payload.userId);
    expect(body.products[0].productId).toBe(1);
    expect(body.products[0].quantity).toBe(3);

    const { valid, errorsText } = validateSchema('cart.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('PUT /carts/:id updates a cart and echoes the new payload', async () => {
    const payload = buildCartPayload({ productId: 2, quantity: 7 });
    const response = await cartApi.updateCart(VALID_CART_ID, payload);

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(VALID_CART_ID);
    expect(body.products[0].productId).toBe(2);
    expect(body.products[0].quantity).toBe(7);

    const { valid, errorsText } = validateSchema('cart.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('DELETE /carts/:id removes a cart and returns the deleted resource', async () => {
    const response = await cartApi.deleteCart(VALID_CART_ID);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(VALID_CART_ID);
  });

  test('Full CRUD lifecycle behaves consistently end to end', async () => {
    // Create
    const createPayload = buildCartPayload({ productId: 4, quantity: 1 });
    const createRes = await cartApi.createCart(createPayload);
    expect([200, 201]).toContain(createRes.status());
    const created = await createRes.json();
    const newId = created.id;

    // Read
    const getRes = await cartApi.getCartById(newId === undefined ? VALID_CART_ID : newId);
    expect(getRes.status()).toBe(200);

    // Update
    const updatePayload = buildCartPayload({ productId: 4, quantity: 9 });
    const updateRes = await cartApi.updateCart(VALID_CART_ID, updatePayload);
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.products[0].quantity).toBe(9);

    // Delete
    const deleteRes = await cartApi.deleteCart(VALID_CART_ID);
    expect(deleteRes.status()).toBe(200);
  });
});
