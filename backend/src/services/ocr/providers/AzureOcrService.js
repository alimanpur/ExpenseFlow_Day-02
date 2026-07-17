/**
 * ExpenseFlow - Azure OCR Service
 * Azure Computer Vision integration for receipt text extraction.
 */
const OcrServiceInterface = require('../OcrService');

class AzureOcrService extends OcrServiceInterface {
  async extractText(_imagePath) {
    throw new Error('AzureOcrService is not yet implemented');
  }

  async extractMetadata(_imagePath) {
    throw new Error('AzureOcrService is not yet implemented');
  }

  async validateReceipt(_imagePath) {
    throw new Error('AzureOcrService is not yet implemented');
  }
}

module.exports = AzureOcrService;
