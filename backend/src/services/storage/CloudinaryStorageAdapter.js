/**
 * ExpenseFlow - Cloudinary Storage Adapter
 * Cloudinary storage adapter (skeleton for future implementation).
 */
const StorageServiceInterface = require('./StorageService');

class CloudinaryStorageAdapter extends StorageServiceInterface {
  constructor() {
    super();
    throw new Error('CloudinaryStorageAdapter is not yet implemented. Configure LOCAL storage or implement this adapter.');
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

module.exports = CloudinaryStorageAdapter;
