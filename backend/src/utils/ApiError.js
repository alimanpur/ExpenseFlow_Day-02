/**
 * ExpenseFlow - Custom API Error Class
 * Structured error handling for consistent API responses.
 */
const { HTTP_STATUS, ERROR_CODES } = require('../constants');

class ApiError extends Error {
  constructor(statusCode, message, errorCode = ERROR_CODES.INTERNAL_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, ERROR_CODES.AUTHENTICATION_ERROR, details);
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, ERROR_CODES.AUTHORIZATION_ERROR, details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, ERROR_CODES.NOT_FOUND, details);
  }

  static conflict(message = 'Resource already exists', details = null) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, ERROR_CODES.DUPLICATE_ERROR, details);
  }

  static unprocessable(message = 'Unprocessable entity', details = null) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE, message, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static tooManyRequests(message = 'Too many requests', details = null) {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message, ERROR_CODES.RATE_LIMIT_ERROR, details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, ERROR_CODES.INTERNAL_ERROR, details);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

module.exports = ApiError;