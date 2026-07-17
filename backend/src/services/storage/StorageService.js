/**
 * ExpenseFlow - Storage Service Interface
 * Swappable storage provider abstraction.
 */

class StorageServiceInterface {
  async upload(_file, _folder) {
    throw new Error('Method not implemented');
  }

  async delete(_filePath) {
    throw new Error('Method not implemented');
  }

  getPublicUrl(_filePath) {
    throw new Error('Method not implemented');
  }
}

module.exports = StorageServiceInterface;
