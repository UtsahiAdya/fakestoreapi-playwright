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
 * Raw schema objects, keyed the same way as the registered $ids above.
 * Kept separately from the compiled Ajv validators so `toStrictSchema`
 * (below) can build a stricter variant on the fly from the SAME source
 * of truth, instead of maintaining a second hand-written "contract"
 * file that could drift out of sync with the real schema.
 */
const rawSchemasById = {
  'cart.schema.json': cartSchema,
  'cartList.schema.json': cartListSchema,
  'authLogin.schema.json': authLoginSchema,
};

/**
 * Validate `data` against a pre-registered schema by its $id.
 * Returns { valid, errors } instead of throwing, so callers can
 * assert with Playwright's `expect` and get a readable failure message.
 *
 
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

/**
 * Deep-clones a schema and tightens every object-type node in place:
 *   - additionalProperties: false  (no unlisted keys allowed)
 *   - required: every key currently listed in `properties`
 * Recurses into nested `properties` and array `items` so a nested
 * object (e.g. each entry in a cart's `products` array) is tightened
 * too, not just the top level.
 */
function toStrictSchema(schema) {
  const clone = JSON.parse(JSON.stringify(schema));

  function strictify(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'object' && node.properties) {
      node.additionalProperties = false;
      node.required = Object.keys(node.properties);
      Object.values(node.properties).forEach(strictify);
    }

    if (node.type === 'array' && node.items) {
      strictify(node.items);
    }
  }

  strictify(clone);
  // Drop $id before ad-hoc compiling so it never collides with the
  // already-registered loose version of the same schema.
  delete clone.$id;
  return clone;
}

/**
 * Strict/contract-mode validation: reuses the SAME schema as
 * `validateSchema`, but rejects any field not explicitly listed and
 * requires every listed field to be present. This is what satisfies
 * "snapshot the response shape and assert future responses conform" -
 * a live response is only valid if its key set matches EXACTLY, so a
 * silently added, removed, or renamed field fails loudly.
 *
 * Deliberately does NOT read from a separate hand-written snapshot
 * file - the schema file itself is the single source of truth for
 * both the loose (general validation) and strict (contract) checks,
 * so there is nothing that can drift out of sync between two files.
 *
 
 */
function validateStrict(schemaId, data) {
  const rawSchema = rawSchemasById[schemaId];
  if (!rawSchema) {
    throw new Error(`No schema registered with id "${schemaId}"`);
  }
  const strictSchema = toStrictSchema(rawSchema);
  const valid = ajv.validate(strictSchema, data);
  const errors = valid ? [] : ajv.errors;
  return {
    valid,
    errors,
    errorsText: valid ? '' : ajv.errorsText(errors, { separator: '\n' }),
  };
}

module.exports = { validateSchema, validateStrict };