/**
 * ExpenseFlow - Validation Middleware
 * Validates request data using Zod schemas before passing to controllers.
 */
const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request properties with parsed (and defaulted) values
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;

      next();
    } catch (error) {
      if (error.errors) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        return next(ApiError.badRequest('Validation failed', details));
      }
      next(ApiError.badRequest('Invalid request data'));
    }
  };
};

module.exports = validate;