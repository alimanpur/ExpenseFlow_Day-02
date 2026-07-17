/**
 * ExpenseFlow - Async Error Handler
 * Wraps async route handlers to catch errors and forward to error middleware.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;