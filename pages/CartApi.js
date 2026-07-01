const { BaseApi } = require('./BaseApi');

/**
 * CartApi
 * -------
 * Page Object (API Object) for the /carts resource.
 * Every Cart CRUD operation used by the tests lives here, so if
 * FakeStoreAPI ever changes a path or a param, only this file changes.
 */
class CartApi extends BaseApi {
  constructor(request) {
    super(request);
    this.basePath = '/carts';
  }

  /**
   * GET /carts
   * @param {string} [token]
   * @param {{limit?: number, sort?: 'asc'|'desc', startdate?: string, enddate?: string}} [params]
   *   Documented query params from the FakeStoreAPI source README.
   */
  async getAllCarts(token, params) {
    return this.request.get(this.basePath + this.toQueryString(params), {
      headers: this.authHeader(token),
    });
  }

  /** GET /carts/:id */
  async getCartById(id, token) {
    return this.request.get(`${this.basePath}/${id}`, {
      headers: this.authHeader(token),
    });
  }

  /**
   * GET /carts/user/:userId
   * @param {string} [token]
   * @param {{startdate?: string, enddate?: string}} [params]
   */
  async getCartsByUserId(userId, token, params) {
    return this.request.get(`${this.basePath}/user/${userId}${this.toQueryString(params)}`, {
      headers: this.authHeader(token),
    });
  }

  /** POST /carts */
  async createCart(payload, token) {
    return this.request.post(this.basePath, {
      data: payload,
      headers: this.authHeader(token),
    });
  }

  /** PUT /carts/:id */
  async updateCart(id, payload, token) {
    return this.request.put(`${this.basePath}/${id}`, {
      data: payload,
      headers: this.authHeader(token),
    });
  }

  /** DELETE /carts/:id */
  async deleteCart(id, token) {
    return this.request.delete(`${this.basePath}/${id}`, {
      headers: this.authHeader(token),
    });
  }

  /**
   * Build a `?a=1&b=2` query string from a plain object, skipping
   * undefined/null values. Returns '' when params is falsy/empty.
   */
  toQueryString(params) {
    if (!params) return '';
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return '';
    return `?${new URLSearchParams(entries).toString()}`;
  }
}

module.exports = { CartApi };
