const { BaseApi } = require('./BaseApi');

/**
 * UsersApi
 * --------
 * Page Object for the /users resource. Used by the Authentication suite
 * to source REAL, currently-seeded login credentials at test time
 * instead of hardcoding a specific demo account that could be deleted,
 * rotated, or reset upstream.
 *
 * Per FakeStoreAPI's own source README, /users returns full user
 * records including plaintext `username`/`password` fields (the API
 * intentionally does not hash demo-account passwords).
 */
class UsersApi extends BaseApi {
  constructor(request) {
    super(request);
    this.basePath = '/users';
  }

  /** GET /users */
  async getAllUsers() {
    return this.request.get(this.basePath);
  }

  /** GET /users/:id */
  async getUserById(id) {
    return this.request.get(`${this.basePath}/${id}`);
  }
}

module.exports = { UsersApi };
