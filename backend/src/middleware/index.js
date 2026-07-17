/**
 * ExpenseFlow - Middleware Index
 * Centralized middleware exports.
 */
const validate = require('./validate');
const auth = require('./auth');
const errorHandler = require('./error');
const upload = require('./upload');

module.exports = {
  validate,
  ...auth,
  errorHandler,
  ...upload,
};