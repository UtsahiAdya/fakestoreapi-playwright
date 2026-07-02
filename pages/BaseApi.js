/**
 * BaseApi
 * -------
 * Shared foundation for every "API Page Object" in this suite.
 * In an API-testing context, a Page Object becomes a thin, intention-revealing
 * wrapper around Playwright's APIRequestContext for one REST resource
 * (e.g. /carts, /auth, /products). Tests should never call `request.get(...)`
 * directly — they should call `cartApi.getCartById(1)` etc. This keeps
 * endpoint paths, headers and request shaping in ONE place.
 */
class BaseApi {
  
  constructor(request) {
    this.request = request;
  }

  /**
   * Attach an Authorization header only when a token is supplied,
   * so the same methods can be reused for authenticated and
   * unauthenticated test scenarios.
   * @param {string} [token]
   */
  authHeader(token) {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

module.exports = { BaseApi };
