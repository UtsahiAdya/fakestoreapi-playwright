const { test, expect } = require('@playwright/test');
const { CartApi } = require('../pages/CartApi');
const { validateSchema, validateStrict } = require('../utils/schemaValidator');
const { VALID_CART_ID } = require('../fixtures/testData');

/**
 * Schema / Contract test (senior bonus).
 *
 * Two layers of protection, both driven by the SAME schema file
 * (fixtures/schemas/cart.schema.json) - one source of truth, no
 * separate hand-written snapshot file that could drift out of sync:
 *
 *  1. LOOSE validation (validateSchema) - catches type drift (e.g.
 *     id becomes a string) and missing required fields, while
 *     tolerating extra fields the API might add over time.
 *  2. STRICT validation (validateStrict) - takes the exact same
 *     schema and, at validation time, treats every listed field as
 *     required and forbids any field not listed. This is what
 *     satisfies "snapshot the response shape and assert future
 *     responses conform": if FakeStoreAPI's cart shape ever silently
 *     ADDS, REMOVES, or RENAMES a field, this test fails with a
 *     precise Ajv error naming the exact field - instead of a
 *     downstream consumer discovering it via a runtime crash.
 */
test.describe('Cart - Schema / Contract validation', () => {
  let cartApi;

  test.beforeEach(async ({ request }) => {
    cartApi = new CartApi(request);
  });

  test('GET /carts/:id response conforms to the Ajv JSON schema', async () => {
    const response = await cartApi.getCartById(VALID_CART_ID);
    expect(response.status()).toBe(200);
    const body = await response.json();

    const { valid, errorsText } = validateSchema('cart.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('GET /carts/:id response conforms strictly to the cart schema (no unexpected or missing fields)', async () => {
    const response = await cartApi.getCartById(VALID_CART_ID);
    const body = await response.json();

    const { valid, errorsText } = validateStrict('cart.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('POST /carts response (newly created cart) also conforms to the cart schema', async () => {
    const response = await cartApi.createCart({
      userId: 5,
      date: new Date().toISOString(),
      products: [{ productId: 1, quantity: 1 }],
    });
    const body = await response.json();

    const { valid, errorsText } = validateSchema('cart.schema.json', body);
    expect(valid, errorsText).toBe(true);
  });

  test('GET /carts (list) every item conforms to the cart schema', async () => {
    const response = await cartApi.getAllCarts();
    const body = await response.json();

    const { valid, errorsText } = validateSchema('cartList.schema.json', body);
    expect(valid, errorsText).toBe(true);

    // Belt-and-braces: validate each item individually too, so a single
    // malformed entry in a large array is reported clearly rather than
    // as one big Ajv error blob.
    for (const cart of body) {
      const result = validateSchema('cart.schema.json', cart);
      expect(result.valid, `Cart id=${cart.id}: ${result.errorsText}`).toBe(true);
    }
  });
});