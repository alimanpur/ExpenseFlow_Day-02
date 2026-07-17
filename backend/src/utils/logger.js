/**
 * ExpenseFlow - Logger Utility
 * Structured logging with Morgan integration for HTTP request logging.
 */
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const config = require('../config');

// Ensure log directory exists
const logDir = path.dirname(config.logging.filePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create write stream for file logging
const accessLogStream = fs.createWriteStream(config.logging.filePath, { flags: 'a' });

// Morgan stream configuration
const morganStream = {
  write: (message) => {
    accessLogStream.write(message);
    if (config.isDev) {
      process.stdout.write(message);
    }
  },
};

// Morgan format based on environment
const morganFormat = config.isDev ? 'dev' : 'combined';

// HTTP request logger middleware
const httpLogger = morgan(morganFormat, {
  stream: morganStream,
  skip: (_req) => config.isTest,
});

// Application logger
const logger = {
  info: (message, meta = {}) => {
    const logEntry = formatLogEntry('INFO', message, meta);
    console.log(logEntry.trim());
    writeToFile(logEntry);
  },

  warn: (message, meta = {}) => {
    const logEntry = formatLogEntry('WARN', message, meta);
    console.warn(logEntry.trim());
    writeToFile(logEntry);
  },

  error: (message, meta = {}) => {
    const logEntry = formatLogEntry('ERROR', message, meta);
    console.error(logEntry.trim());
    writeToFile(logEntry);
  },

  debug: (message, meta = {}) => {
    if (config.isDev) {
      const logEntry = formatLogEntry('DEBUG', message, meta);
      console.debug(logEntry.trim());
    }
  },
};

function formatLogEntry(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
}

function writeToFile(entry) {
  try {
    accessLogStream.write(entry);
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
}

module.exports = { logger, httpLogger, warn: logger.warn, info: logger.info, error: logger.error, debug: logger.debug };