/**
 * ExpenseFlow - Express Application
 * Core Express app setup with middleware, routes, and error handling.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { httpLogger } = require('./utils/logger');
const errorHandler = require('./middleware/error');
const ApiError = require('./utils/ApiError');

const app = express();

// ─── Security Middleware ──────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.cors.origin === '*' ? true : config.cors.origin.split(',').map(o => o.trim()),
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ───────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_ERROR',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth endpoints stricter rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_ERROR',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookie.secret));

// ─── Compression ─────────────────────────────────────────
app.use(compression());

// ─── Logging ─────────────────────────────────────────────
app.use(httpLogger);

// ─── Static Files ────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── API Routes ──────────────────────────────────────────
app.use(config.server.apiPrefix, routes);

// ─── 404 Handler ─────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
});

// ─── Global Error Handler ────────────────────────────────
app.use(errorHandler);

module.exports = app;