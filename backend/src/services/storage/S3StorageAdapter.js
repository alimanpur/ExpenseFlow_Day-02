/**
 * ExpenseFlow - S3 Storage Adapter
 * AWS S3 storage adapter (skeleton for future implementation).
 */
const StorageServiceInterface = require('./StorageService');

class S3StorageAdapter extends StorageServiceInterface {
  constructor() {
    super();
    throw new Error('S3StorageAdapter is not yet implemented. Configure LOCAL storage or implement this adapter.');
  }

  async upload(_file, _folder) {
    throw new Error('Not implemented');
  }

  async delete(_filePath) {
    throw new Error('Not implemented');
  }

  getPublicUrl(_filePath) {
    throw new Error('Not implemented');
  }
}

module.exports = S3StorageAdapter;
