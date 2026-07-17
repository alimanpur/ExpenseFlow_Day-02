/**
 * ExpenseFlow - Helper Utilities
 * General-purpose helper functions used across the application.
 */
const { REGEX } = require('../constants');

/**
 * Generate a random token string
 * @param {number} length - Length of the token
 * @returns {string} Random hex token
 */
const generateToken = (length = 32) => {
  const nodeCrypto = require('crypto');
  return nodeCrypto.randomBytes(length).toString('hex');
};

/**
 * Generate a numeric OTP
 * @param {number} length - Number of digits
 * @returns {string} Numeric OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  return REGEX.EMAIL.test(email);
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  return REGEX.OBJECT_ID.test(id);
};

/**
 * Sanitize user object (remove sensitive fields)
 * @param {Object} user - User document
 * @returns {Object} Sanitized user
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const sanitized = user.toObject ? user.toObject({ virtuals: false }) : { ...user };
  delete sanitized.password;
  delete sanitized.passwordResetToken;
  delete sanitized.passwordResetExpires;
  delete sanitized.emailVerificationToken;
  delete sanitized.refreshTokens;
  delete sanitized.__v;
  return sanitized;
};

/**
 * Parse pagination parameters from query
 * @param {Object} query - Request query object
 * @returns {Object} { page, limit, skip }
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build pagination meta object
 * @param {number} total - Total documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination meta
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Calculate percentage
 * @param {number} value
 * @param {number} total
 * @returns {number}
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
};

/**
 * Round to specified decimal places
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
const roundTo = (value, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Generate a unique slug
 * @param {string} text
 * @returns {string}
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
};

/**
 * Mask email for privacy
 * @param {string} email
 * @returns {string}
 */
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  const maskedName = name[0] + '***' + name[name.length - 1];
  return `${maskedName}@${domain}`;
};

/**
 * Deep clone an object
 * @param {Object} obj
 * @returns {Object}
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value
 * @returns {boolean}
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

module.exports = {
  generateToken,
  generateOTP,
  isValidEmail,
  isValidObjectId,
  sanitizeUser,
  parsePagination,
  buildPaginationMeta,
  calculatePercentage,
  roundTo,
  generateSlug,
  maskEmail,
  deepClone,
  isEmpty,
};