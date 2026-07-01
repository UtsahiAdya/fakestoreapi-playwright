const { test, expect } = require('@playwright/test');
const { CartApi } = require('../pages/CartApi');
const { ProductsApi } = require('../pages/ProductsApi');
const { validateSchema } = require('../utils/schemaValidator');
const {
  DATA_DRIVEN_PRODUCT_IDS,
  buildCartPayload,
  VALID_CART_ID,
} = require('../fixtures/testData');

/**
 * Data-driven test: the SAME "add product to cart" scenario is executed
 * once per product ID in fixtures/testData.js (DATA_DRIVEN_PRODUCT_IDS,
 * currently 5 IDs — exceeds the required 3+).
 *
 * For each product ID we:
 *  1. Sanity-check the product actually exists (via ProductsApi).
 *  2. POST a cart containing that product and assert it's echoed back
 *     correctly with the right shape (schema-validated).
 *  3. PUT (update) a cart to swap in that product and assert the same.
 *
 * Adding a 6th product ID to test requires editing ONLY testData.js.
 */
test.describe('Cart - Data-driven across product IDs', () => {
  let cartApi;
  let productsApi;

  test.beforeEach(async ({ request }) => {
    cartApi = new CartApi(request);
    productsApi = new ProductsApi(request);
  });

  for (const productId of DATA_DRIVEN_PRODUCT_IDS) {
    test(`product ${productId}: exists, can be POSTed into a new cart, and PUT into an existing cart`, async () => {
      // --- Sanity: the product referenced by this scenario is real ---
      const productRes = await productsApi.getProductById(productId);
      expect(productRes.status()).toBe(200);
      const product = await productRes.json();
      expect(product.id).toBe(productId);

      // --- POST: create a cart containing this product ---
      const quantity = (productId % 5) + 1; // varies 1-5, still deterministic
      const createPayload = buildCartPayload({ productId, quantity });
      const createRes = await cartApi.createCart(createPayload);
      expect([200, 201]).toContain(createRes.status());

      const createdCart = await createRes.json();
      expect(createdCart.products[0].productId).toBe(productId);
      expect(createdCart.products[0].quantity).toBe(quantity);

      const { valid: createValid, errorsText: createErrors } = validateSchema(
        'cart.schema.json',
        createdCart
      );
      expect(createValid, createErrors).toBe(true);

      // --- PUT: update an existing cart to use this product ---
      const updatePayload = buildCartPayload({ productId, quantity });
      const updateRes = await cartApi.updateCart(VALID_CART_ID, updatePayload);
      expect(updateRes.status()).toBe(200);

      const updatedCart = await updateRes.json();
      expect(updatedCart.products[0].productId).toBe(productId);
      expect(updatedCart.products[0].quantity).toBe(quantity);

      const { valid: updateValid, errorsText: updateErrors } = validateSchema(
        'cart.schema.json',
        updatedCart
      );
      expect(updateValid, updateErrors).toBe(true);
    });
  }
});
