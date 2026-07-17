/**
 * ExpenseFlow - Error Handling Middleware
 * Global error handler for consistent error responses.
 */
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Log error
  logger.error(err.message, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId || 'anonymous',
    stack: config.isDev ? err.stack : undefined,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed', details);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = ApiError.conflict(`Duplicate value for ${field}. This ${field} is already in use.`);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // Mongoose document not found
  if (err.name === 'DocumentNotFoundError') {
    error = ApiError.notFound('Resource not found');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token has expired');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File too large. Maximum size is 5MB');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = ApiError.badRequest('Unexpected file field');
  }

  // Send response
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: {
      code: error.errorCode || 'INTERNAL_ERROR',
      message: error.isOperational ? error.message : 'Internal server error',
      ...(error.details && { details: error.details }),
      ...(config.isDev && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;