const { test, expect } = require('@playwright/test');
const { CartApi } = require('../pages/CartApi');
const { validateSchema } = require('../utils/schemaValidator');
const { VALID_CART_ID } = require('../fixtures/testData');
const contractSnapshot = require('../fixtures/schemas/cart.contract-snapshot.json');

/**
 * Schema / Contract test (senior bonus).
 *
 * Two layers of protection:
 *  1. Ajv JSON-Schema validation against fixtures/schemas/cart.schema.json
 *     — catches type drift (e.g. id becomes a string) and missing
 *       required fields.
 *  2. A hand-captured "contract snapshot" (cart.contract-snapshot.json)
 *     of the exact key set and per-field types observed on a known-good
 *     response. This catches the cases Ajv with `additionalProperties:
 *     true` would silently allow — e.g. the API quietly ADDING a new
 *     field, or RENAMING one — which is exactly the kind of breaking
 *     change that snaps frontend integrations using this API.
 *
 * If FakeStoreAPI's cart shape ever changes, this test fails with a
 * precise diff of which keys/types changed, instead of a downstream
 * consumer discovering it via a runtime crash.
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

  test('GET /carts/:id response conforms to the captured contract snapshot', async () => {
    const response = await cartApi.getCartById(VALID_CART_ID);
    const body = await response.json();

    const actualTopLevelKeys = Object.keys(body).sort();
    const expectedTopLevelKeys = [...contractSnapshot.topLevelKeys].sort();
    expect(
      actualTopLevelKeys,
      `Top-level cart keys drifted from the captured contract.\nExpected: ${expectedTopLevelKeys}\nActual:   ${actualTopLevelKeys}`
    ).toEqual(expectedTopLevelKeys);

    for (const [field, expectedType] of Object.entries(contractSnapshot.types)) {
      const actualType = Array.isArray(body[field]) ? 'array' : typeof body[field];
      const normalizedExpected = expectedType === 'integer' ? 'number' : expectedType;
      expect(actualType, `Field "${field}" changed type`).toBe(normalizedExpected);
    }

    if (Array.isArray(body.products) && body.products.length > 0) {
      const actualProductKeys = Object.keys(body.products[0]).sort();
      const expectedProductKeys = [...contractSnapshot.productItemKeys].sort();
      expect(
        actualProductKeys,
        `Cart line-item keys drifted from the captured contract.\nExpected: ${expectedProductKeys}\nActual:   ${actualProductKeys}`
      ).toEqual(expectedProductKeys);
    }
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
