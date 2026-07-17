/**
 * ExpenseFlow - Storage Service Factory
 * Returns the configured storage adapter.
 */
const LocalStorageAdapter = require('./LocalStorageAdapter');
const S3StorageAdapter = require('./S3StorageAdapter');
const CloudinaryStorageAdapter = require('./CloudinaryStorageAdapter');

function getStorageService() {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

  switch (provider) {
    case 's3':
      return new S3StorageAdapter();
    case 'cloudinary':
      return new CloudinaryStorageAdapter();
    case 'local':
    default:
      return new LocalStorageAdapter();
  }
}

module.exports = { getStorageService };
