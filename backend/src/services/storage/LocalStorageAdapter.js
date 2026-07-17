/**
 * ExpenseFlow - Local Storage Adapter
 * Stores files on the local filesystem.
 */
const fs = require('fs').promises;
const path = require('path');
const StorageServiceInterface = require('./StorageService');
const config = require('../../config');

class LocalStorageAdapter extends StorageServiceInterface {
  constructor() {
    super();
    this.uploadDir = config.upload.dir;
  }

  async upload(file, folder = '') {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const storedFilename = `${file.fieldname || 'file'}-${uniqueSuffix}${ext}`;
    const relativePath = folder ? path.posix.join(folder, storedFilename) : storedFilename;
    const absolutePath = path.join(this.uploadDir, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    const buffer = file.buffer || file.stream;
    await fs.writeFile(absolutePath, buffer);

    return {
      path: relativePath,
      url: `/uploads/${relativePath}`,
      filename: storedFilename,
    };
  }

  async delete(filePath) {
    const absolutePath = path.join(this.uploadDir, filePath);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getPublicUrl(filePath) {
    return `/uploads/${filePath}`;
  }
}

module.exports = LocalStorageAdapter;
