const { BaseApi } = require('./BaseApi');

/**
 * ProductsApi
 * -----------
 * Minimal Page Object for /products, used to validate that product IDs
 * referenced in the data-driven cart tests are real, existing products
 * (keeps the cart tests honest rather than testing against arbitrary
 * numbers).
 */
class ProductsApi extends BaseApi {
  constructor(request) {
    super(request);
    this.basePath = '/products';
  }

  /** GET /products/:id */
  async getProductById(id) {
    return this.request.get(`${this.basePath}/${id}`);
  }
}

module.exports = { ProductsApi };
