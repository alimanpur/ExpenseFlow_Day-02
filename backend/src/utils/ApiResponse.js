/**
 * ExpenseFlow - Standard API Response
 * Consistent response structure for all successful API responses.
 */
class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  static success(message = 'Success', data = null, meta = null) {
    return new ApiResponse(200, message, data, meta);
  }

  static created(message = 'Created successfully', data = null) {
    return new ApiResponse(201, message, data);
  }

  static accepted(message = 'Request accepted', data = null) {
    return new ApiResponse(202, message, data);
  }

  static noContent(message = 'No content') {
    return new ApiResponse(204, message);
  }

  send(res) {
    const response = {
      success: this.success,
      message: this.message,
      timestamp: this.timestamp,
    };

    if (this.data !== null) response.data = this.data;
    if (this.meta !== null) response.meta = this.meta;

    return res.status(this.statusCode).json(response);
  }
}

module.exports = ApiResponse;