const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const cartSchema = require('../fixtures/schemas/cart.schema.json');
const cartListSchema = require('../fixtures/schemas/cartList.schema.json');
const authLoginSchema = require('../fixtures/schemas/authLogin.schema.json');

/**
 * Single shared Ajv instance with all schemas pre-registered so that
 * $ref resolution (cartList -> cart) works across files.
 */
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

ajv.addSchema(cartSchema, 'cart.schema.json');
ajv.addSchema(cartListSchema, 'cartList.schema.json');
ajv.addSchema(authLoginSchema, 'authLogin.schema.json');

/**
 * Validate `data` against a pre-registered schema by its $id.
 * Returns { valid, errors } instead of throwing, so callers can
 * assert with Playwright's `expect` and get a readable failure message.
 *
 * @param {'cart.schema.json'|'cartList.schema.json'|'authLogin.schema.json'} schemaId
 * @param {unknown} data
 */
function validateSchema(schemaId, data) {
  const validateFn = ajv.getSchema(schemaId);
  if (!validateFn) {
    throw new Error(`No schema registered with id "${schemaId}"`);
  }
  const valid = validateFn(data);
  return {
    valid,
    errors: valid ? [] : validateFn.errors,
    errorsText: valid ? '' : ajv.errorsText(validateFn.errors, { separator: '\n' }),
  };
}

module.exports = { validateSchema };
