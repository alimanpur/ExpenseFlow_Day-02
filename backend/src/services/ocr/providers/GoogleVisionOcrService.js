/**
 * ExpenseFlow - Google Vision OCR Service
 * Google Cloud Vision integration for receipt text extraction.
 */
const OcrServiceInterface = require('./OcrService');

class GoogleVisionOcrService extends OcrServiceInterface {
  async extractText(_imagePath) {
    throw new Error('GoogleVisionOcrService is not yet implemented');
  }

  async extractMetadata(_imagePath) {
    throw new Error('GoogleVisionOcrService is not yet implemented');
  }

  async validateReceipt(_imagePath) {
    throw new Error('GoogleVisionOcrService is not yet implemented');
  }
}

module.exports = GoogleVisionOcrService;
