/**
 * ExpenseFlow - Database Configuration
 * MongoDB connection using Mongoose with connection pooling and event handling.
 */
const mongoose = require('mongoose');
const config = require('./index');
const { logger } = require('../utils/logger');

class Database {
  constructor() {
    this.uri = config.isTest ? config.mongodb.uriTest : config.mongodb.uri;
    this.options = {
      ...config.mongodb.options,
      autoIndex: config.isDev,
    };
  }

  async connect() {
    try {
      const conn = await mongoose.connect(this.uri, this.options);
      logger.info(`MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      if (config.isDev) {
        try {
          await mongoose.connection.db.collection('members').dropIndex('user_1_circle_1');
          logger.info('[Migration] Dropped stale members.user_1_circle_1 index (will be recreated with partialFilterExpression)');
        } catch (err) {
          if (err.code !== 27 && !err.message?.includes('index not found')) {
            logger.warn('[Migration] Could not drop members index', { error: err.message });
          }
        }
      }

      return conn;
    } catch (error) {
      logger.error('MongoDB connection failed', { error: error.message });
      if (config.isProd) {
        process.exit(1);
      }
      return null;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  }

  async dropDatabase() {
    if (config.isTest) {
      await mongoose.connection.dropDatabase();
    }
  }
}

module.exports = new Database();