/**
 * ExpenseFlow - Configuration
 * Centralized application configuration loaded from environment variables.
 */
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

const TIME_UNITS = {
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
};

const parseDuration = (str) => {
  const match = String(str).match(/^(\d+)([smhd])?$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';
  return value * (TIME_UNITS[unit] || 1000);
};

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',

  // Server
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    baseUrl: process.env.BASE_URL || `http://localhost:${parseInt(process.env.PORT, 10) || 5000}`,
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow',
    uriTest: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/expenseflow_test',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || (!isProd ? 'dev-access-secret-change-in-production' : undefined),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (!isProd ? 'dev-refresh-secret-change-in-production' : undefined),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Bcrypt
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Email (Resend)
  email: {
    resend: {
      apiKey: process.env.RESEND_API_KEY,
    },
    from: process.env.EMAIL_FROM || 'noreply@expenseflow.app',
    fromName: process.env.EMAIL_FROM_NAME || 'ExpenseFlow',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Cookie
  cookie: {
    secret: process.env.COOKIE_SECRET || (!isProd ? 'dev-cookie-secret' : undefined),
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: true,
    sameSite: 'lax',
    accessTokenMaxAge: parseDuration(process.env.JWT_ACCESS_EXPIRES_IN) || 15 * 60 * 1000,
    refreshTokenMaxAge: parseDuration(process.env.JWT_REFRESH_EXPIRES_IN) || 7 * 24 * 60 * 60 * 1000,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'dev',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || (!isProd ? 'default-encryption-key-32chars!' : undefined),
  },
});

module.exports = config;