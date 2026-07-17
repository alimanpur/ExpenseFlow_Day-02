/**
 * ExpenseFlow - Noop OCR Service
 * Placeholder implementation when no OCR provider is configured.
 */
const OcrServiceInterface = require('./OcrService');

class NoopOcrService extends OcrServiceInterface {
  async extractText(_imagePath) {
    return '';
  }

  async extractMetadata(_imagePath) {
    return {};
  }

  async validateReceipt(_imagePath) {
    return { isValid: true, confidence: 1 };
  }
}

module.exports = NoopOcrService;
