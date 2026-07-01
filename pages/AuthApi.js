const { BaseApi } = require('./BaseApi');

/**
 * AuthApi
 * -------
 * Page Object for the /auth resource. Used by the authentication
 * test suite and to obtain a token that other suites can optionally
 * attach to Cart requests.
 */
class AuthApi extends BaseApi {
  constructor(request) {
    super(request);
    this.basePath = '/auth';
  }

  /** POST /auth/login */
  async login(credentials) {
    return this.request.post(`${this.basePath}/login`, {
      data: credentials,
    });
  }
}

module.exports = { AuthApi };
